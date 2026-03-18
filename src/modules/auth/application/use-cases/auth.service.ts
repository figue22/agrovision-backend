import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from '@modules/auth/application/dto';
import { AuthMapper } from '@modules/auth/application/mappers/auth.mapper';
import { Rol } from '@common/enums/enums';

interface JwtPayload {
  sub: string;
  correo: string;
  rol: string;
  tipo: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Agricultor)
    private readonly agricultorRepository: Repository<Agricultor>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ── REGISTRO ──
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Verificar correo duplicado
    const existeCorreo = await this.usuarioRepository.findOne({
      where: { correo: dto.correo.toLowerCase().trim() },
    });
    if (existeCorreo) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    // Verificar cédula duplicada si es agricultor
    if (dto.agricultor) {
      const existeCedula = await this.agricultorRepository.findOne({
        where: { cedula: dto.agricultor.cedula.trim() },
      });
      if (existeCedula) {
        throw new ConflictException('Ya existe un agricultor con esa cédula');
      }
    }

    // Hash de contraseña con Argon2id
    const contrasenaHash = await argon2.hash(dto.contrasena, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Transacción: crear usuario + agricultor juntos
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let usuarioGuardado: Usuario;
    let agricultorGuardado: Agricultor | null = null;

    try {
      // Crear usuario
      const usuario = queryRunner.manager.create(Usuario, {
        correo: dto.correo.toLowerCase().trim(),
        contrasena_hash: contrasenaHash,
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        telefono: dto.telefono?.trim(),
        rol: dto.agricultor ? Rol.AGRICULTOR : Rol.TECNICO,
      });
      usuarioGuardado = await queryRunner.manager.save(usuario);

      // Crear agricultor si se enviaron los datos
      if (dto.agricultor) {
        const agricultor = queryRunner.manager.create(Agricultor, {
          usuario_id: usuarioGuardado.usuario_id,
          cedula: dto.agricultor.cedula.trim(),
          direccion: dto.agricultor.direccion?.trim(),
          municipio: dto.agricultor.municipio.trim(),
          departamento: dto.agricultor.departamento.trim(),
          tamano_finca_ha: dto.agricultor.tamano_finca_ha,
        });
        agricultorGuardado = await queryRunner.manager.save(agricultor);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Generar tokens
    const tokens = await this.generateTokens(usuarioGuardado);

    return {
      ...tokens,
      usuario: AuthMapper.toResponseDto(usuarioGuardado, agricultorGuardado),
    };
  }

  // ── LOGIN ──
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: dto.correo.toLowerCase().trim() },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!usuario.esta_activo) {
      throw new ForbiddenException('La cuenta está deshabilitada');
    }

    const contrasenaValida = await argon2.verify(
      usuario.contrasena_hash,
      dto.contrasena,
    );

    if (!contrasenaValida) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Actualizar último login
    usuario.ultimo_login = new Date();
    await this.usuarioRepository.save(usuario);

    // Buscar datos de agricultor si existe
    let agricultor: Agricultor | null = null;
    if (usuario.rol === Rol.AGRICULTOR) {
      agricultor = await this.agricultorRepository.findOne({
        where: { usuario_id: usuario.usuario_id },
      });
    }

    const tokens = await this.generateTokens(usuario);

    return {
      ...tokens,
      usuario: AuthMapper.toResponseDto(usuario, agricultor),
    };
  }

  // ── REFRESH TOKEN ──
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.tipo !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }

      const usuario = await this.usuarioRepository.findOne({
        where: { usuario_id: payload.sub },
      });

      if (!usuario || !usuario.esta_activo) {
        throw new UnauthorizedException('Usuario no encontrado o deshabilitado');
      }

      let agricultor: Agricultor | null = null;
      if (usuario.rol === Rol.AGRICULTOR) {
        agricultor = await this.agricultorRepository.findOne({
          where: { usuario_id: usuario.usuario_id },
        });
      }

      const tokens = await this.generateTokens(usuario);

      return {
        ...tokens,
        usuario: AuthMapper.toResponseDto(usuario, agricultor),
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  // ── OBTENER PERFIL ──
  async getProfile(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return usuario;
  }

  // ── GENERAR TOKENS ──
  private async generateTokens(
    usuario: Usuario,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: usuario.usuario_id,
      correo: usuario.correo,
      rol: usuario.rol,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, tipo: 'access' },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
        },
      ),
      this.jwtService.signAsync(
        { ...payload, tipo: 'refresh' },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
        },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
