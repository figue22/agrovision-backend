import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Enable2faResponseDto } from '@modules/auth/application/dto/two-factor.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const otplib = require('otplib');

@Injectable()
export class TwoFactorService {
  private readonly APP_NAME = 'AgroVision';
  private readonly BACKUP_CODES_COUNT = 8;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  // ── Generar backup codes ──
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

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

  async verify(usuarioId: string, codigo: string): Promise<{ mensaje: string; backup_codes: string[] }> {
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

    const backupCodes = this.generateBackupCodes();

    usuario.tiene_2fa = true;
    usuario.backup_codes = backupCodes;
    await this.usuarioRepo.save(usuario);

    return {
      mensaje: '2FA activado correctamente. Guarda estos códigos de respaldo en un lugar seguro.',
      backup_codes: backupCodes,
    };
  }

  async disable(usuarioId: string, codigo: string): Promise<{ mensaje: string }> {
    const usuario = await this.findUsuario(usuarioId);

    if (!usuario.tiene_2fa) {
      throw new BadRequestException('2FA no está habilitado');
    }

    // Intentar verificar como TOTP
    const resultado = otplib.verifySync({
      token: codigo,
      secret: usuario.totp_secret,
    });

    // Si no es TOTP válido, intentar como backup code
    if (!resultado.valid) {
      const backupValid = this.useBackupCode(usuario, codigo);
      if (!backupValid) {
        throw new UnauthorizedException('Código 2FA o código de respaldo inválido');
      }
      await this.usuarioRepo.save(usuario);
    }

    usuario.tiene_2fa = false;
    usuario.totp_secret = '';
    usuario.backup_codes = [];
    await this.usuarioRepo.save(usuario);

    return { mensaje: '2FA desactivado correctamente' };
  }

  async validateCode(usuarioId: string, codigo: string): Promise<boolean> {
    const usuario = await this.findUsuario(usuarioId);

    if (!usuario.tiene_2fa || !usuario.totp_secret) {
      throw new ForbiddenException('2FA no está configurado');
    }

    // Primero intentar TOTP
    const resultado = otplib.verifySync({
      token: codigo,
      secret: usuario.totp_secret,
    });

    if (resultado.valid) {
      return true;
    }

    // Si no es TOTP, intentar backup code
    const backupValid = this.useBackupCode(usuario, codigo);
    if (backupValid) {
      await this.usuarioRepo.save(usuario);
      return true;
    }

    return false;
  }

  // ── Validar y consumir backup code ──
  private useBackupCode(usuario: Usuario, codigo: string): boolean {
    if (!usuario.backup_codes || usuario.backup_codes.length === 0) {
      return false;
    }

    const codeUpper = codigo.toUpperCase();
    const index = usuario.backup_codes.indexOf(codeUpper);

    if (index === -1) {
      return false;
    }

    // Eliminar el código usado (un solo uso)
    usuario.backup_codes.splice(index, 1);
    return true;
  }

  // ── Regenerar backup codes ──
  async regenerateBackupCodes(usuarioId: string, codigo: string): Promise<{ backup_codes: string[] }> {
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

    const backupCodes = this.generateBackupCodes();
    usuario.backup_codes = backupCodes;
    await this.usuarioRepo.save(usuario);

    return { backup_codes: backupCodes };
  }

  async getStatus(usuarioId: string): Promise<{ tiene_2fa: boolean; backup_codes_remaining: number }> {
    const usuario = await this.findUsuario(usuarioId);
    return {
      tiene_2fa: usuario.tiene_2fa,
      backup_codes_remaining: usuario.backup_codes?.length || 0,
    };
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