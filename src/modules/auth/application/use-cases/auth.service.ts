import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── REGISTRO ──
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Verificar si el correo ya existe
    const existente = await this.usuarioRepository.findOne({
      where: { correo: dto.correo.toLowerCase().trim() },
    });

    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    // Hash de contraseña con Argon2id
    const contrasenaHash = await argon2.hash(dto.contrasena, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Crear usuario
    const usuario = this.usuarioRepository.create({
      correo: dto.correo.toLowerCase().trim(),
      contrasena_hash: contrasenaHash,
      nombre: dto.nombre.trim(),
      apellido: dto.apellido.trim(),
      telefono: dto.telefono?.trim(),
      rol: dto.rol || Rol.AGRICULTOR,
    });

    const guardado = await this.usuarioRepository.save(usuario);

    // Generar tokens
    const tokens = await this.generateTokens(guardado);

    return {
      ...tokens,
      usuario: AuthMapper.toResponseDto(guardado),
    };
  }

  // ── LOGIN ──
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Buscar usuario por correo
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: dto.correo.toLowerCase().trim() },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar que esté activo
    if (!usuario.esta_activo) {
      throw new ForbiddenException('La cuenta está deshabilitada');
    }

    // Verificar contraseña con Argon2id
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

    // Generar tokens
    const tokens = await this.generateTokens(usuario);

    return {
      ...tokens,
      usuario: AuthMapper.toResponseDto(usuario),
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

      const tokens = await this.generateTokens(usuario);

      return {
        ...tokens,
        usuario: AuthMapper.toResponseDto(usuario),
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
