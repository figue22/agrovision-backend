import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';

import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Enable2faResponseDto } from '@modules/auth/application/dto/two-factor.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const otplib = require('otplib');

@Injectable()
export class TwoFactorService {
  private readonly APP_NAME = 'AgroVision';

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async generateSecret(usuarioId: string): Promise<Enable2faResponseDto> {
    const usuario = await this.findUsuario(usuarioId);

    if (usuario.tiene_2fa) {
      throw new BadRequestException('2FA ya está habilitado. Desactívalo primero.');
    }

    const secret = otplib.generateSecret();
    const otpauthUrl = otplib.generateURI({
      issuer: this.APP_NAME,
      label: usuario.correo,
      secret,
    });

    usuario.totp_secret = secret;
    await this.usuarioRepo.save(usuario);

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauth_url: otpauthUrl,
      qr_code: qrCode,
    };
  }

  async verify(usuarioId: string, codigo: string): Promise<{ mensaje: string }> {
    const usuario = await this.findUsuario(usuarioId);

    if (!usuario.totp_secret) {
      throw new BadRequestException('Primero genera el código QR con POST /auth/2fa/generate');
    }

    if (usuario.tiene_2fa) {
      throw new BadRequestException('2FA ya está activo');
    }

    const resultado = otplib.verifySync({
      token: codigo,
      secret: usuario.totp_secret,
    });

    if (!resultado.valid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    usuario.tiene_2fa = true;
    await this.usuarioRepo.save(usuario);

    return { mensaje: '2FA activado correctamente' };
  }

  async disable(usuarioId: string, codigo: string): Promise<{ mensaje: string }> {
    const usuario = await this.findUsuario(usuarioId);

    if (!usuario.tiene_2fa) {
      throw new BadRequestException('2FA no está habilitado');
    }

    const resultado = otplib.verifySync({
      token: codigo,
      secret: usuario.totp_secret,
    });

    if (!resultado.valid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    usuario.tiene_2fa = false;
    usuario.totp_secret = '';
    await this.usuarioRepo.save(usuario);

    return { mensaje: '2FA desactivado correctamente' };
  }

  async validateCode(usuarioId: string, codigo: string): Promise<boolean> {
    const usuario = await this.findUsuario(usuarioId);

    if (!usuario.tiene_2fa || !usuario.totp_secret) {
      throw new ForbiddenException('2FA no está configurado');
    }

    const resultado = otplib.verifySync({
      token: codigo,
      secret: usuario.totp_secret,
    });

    return resultado.valid;
  }

  async getStatus(usuarioId: string): Promise<{ tiene_2fa: boolean }> {
    const usuario = await this.findUsuario(usuarioId);
    return { tiene_2fa: usuario.tiene_2fa };
  }

  private async findUsuario(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return usuario;
  }
}