import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from '@modules/auth/application/dto';
import { AuthMapper } from '@modules/auth/application/mappers/auth.mapper';
import { Rol } from '@common/enums/enums';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const otplib = require('otplib');

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

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existeCorreo = await this.usuarioRepository.findOne({
      where: { correo: dto.correo.toLowerCase().trim() },
    });
    if (existeCorreo) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    if (dto.agricultor) {
      const existeCedula = await this.agricultorRepository.findOne({
        where: { cedula: dto.agricultor.cedula.trim() },
      });
      if (existeCedula) {
        throw new ConflictException('Ya existe un agricultor con esa cédula');
      }
    }

    const contrasenaHash = await argon2.hash(dto.contrasena, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let usuarioGuardado: Usuario;
    let agricultorGuardado: Agricultor | null = null;

    try {
      const usuario = queryRunner.manager.create(Usuario, {
        correo: dto.correo.toLowerCase().trim(),
        contrasena_hash: contrasenaHash,
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        telefono: dto.telefono?.trim(),
        rol: dto.agricultor ? Rol.AGRICULTOR : Rol.TECNICO,
      });
      usuarioGuardado = await queryRunner.manager.save(usuario);

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

    const tokens = await this.generateTokens(usuarioGuardado);

    return {
      ...tokens,
      usuario: AuthMapper.toResponseDto(usuarioGuardado, agricultorGuardado),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto | { requiere_2fa: true; mensaje: string }> {
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

    if (usuario.tiene_2fa) {
      return {
        requiere_2fa: true,
        mensaje: 'Se requiere código 2FA. Usa POST /api/v1/auth/login-2fa',
      };
    }

    usuario.ultimo_login = new Date();
    await this.usuarioRepository.save(usuario);

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

  async loginWith2fa(
    correo: string,
    contrasena: string,
    codigo2fa: string,
  ): Promise<AuthResponseDto> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: correo.toLowerCase().trim() },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!usuario.esta_activo) {
      throw new ForbiddenException('La cuenta está deshabilitada');
    }

    const contrasenaValida = await argon2.verify(
      usuario.contrasena_hash,
      contrasena,
    );

    if (!contrasenaValida) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!usuario.tiene_2fa || !usuario.totp_secret) {
      throw new BadRequestException('Este usuario no tiene 2FA habilitado');
    }

    // Intentar TOTP
    const resultado = otplib.verifySync({
      token: codigo2fa,
      secret: usuario.totp_secret,
    });

    if (!resultado.valid) {
      // Intentar backup code
      if (!usuario.backup_codes || usuario.backup_codes.length === 0) {
        throw new UnauthorizedException('Código 2FA inválido');
      }

      const codeUpper = codigo2fa.toUpperCase();
      const index = usuario.backup_codes.indexOf(codeUpper);

      if (index === -1) {
        throw new UnauthorizedException('Código 2FA inválido');
      }

      // Consumir backup code (un solo uso)
      usuario.backup_codes.splice(index, 1);
    }

    usuario.ultimo_login = new Date();
    await this.usuarioRepository.save(usuario);

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

  async getProfile(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return usuario;
  }

  async forgotPassword(correo: string): Promise<{
    mensaje: string;
    dev_reset_url?: string;
    dev_token?: string;
    dev_expira?: string;
  }> {
    const logger = new Logger('AuthService');
    // Respuesta genérica siempre, para no revelar si el correo existe
    const mensajeGenerico = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

    const usuario = await this.usuarioRepository.findOne({
      where: { correo: correo.toLowerCase().trim() },
    });

    if (!usuario || !usuario.esta_activo) {
      return { mensaje: mensajeGenerico };
    }

    // Generar token seguro de 32 bytes
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    usuario.reset_password_token = token;
    usuario.reset_password_expires = expira;
    await this.usuarioRepository.save(usuario);

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
    const isDev = this.configService.get<string>('NODE_ENV', 'development') === 'development';

    logger.log(`[RESET PASSWORD] Usuario: ${correo} | Enlace: ${resetUrl} | Expira: ${expira.toISOString()}`);

    // En desarrollo: devolver el enlace directamente en la respuesta
    // En producción: reemplazar por envío de email real (Nodemailer / SendGrid)
    if (isDev) {
      return {
        mensaje: mensajeGenerico,
        dev_reset_url: resetUrl,
        dev_token: token,
        dev_expira: expira.toISOString(),
      };
    }

    return { mensaje: mensajeGenerico };
  }

  async resetPassword(token: string, nuevaContrasena: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { reset_password_token: token },
    });

    if (!usuario) {
      throw new BadRequestException('Token inválido o ya utilizado');
    }

    if (!usuario.reset_password_expires || usuario.reset_password_expires < new Date()) {
      usuario.reset_password_token = null;
      usuario.reset_password_expires = null;
      await this.usuarioRepository.save(usuario);
      throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');
    }

    if (!usuario.esta_activo) {
      throw new ForbiddenException('La cuenta está deshabilitada');
    }

    const contrasenaHash = await argon2.hash(nuevaContrasena, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    usuario.contrasena_hash = contrasenaHash;
    usuario.reset_password_token = null;
    usuario.reset_password_expires = null;
    await this.usuarioRepository.save(usuario);

    return { mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

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