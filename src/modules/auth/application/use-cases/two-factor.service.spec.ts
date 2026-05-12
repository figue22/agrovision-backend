import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { TwoFactorService } from './two-factor.service';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Rol } from '@common/enums/enums';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQR'),
}));

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn().mockReturnValue('MOCK_SECRET_123'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/AgroVision:test@test.com?secret=MOCK'),
    verify: jest.fn(),
  },
}));

const otplib = require('otplib');

const mockUsuario: Partial<Usuario> = {
  usuario_id: 'uuid-user-1',
  correo: 'test@test.com',
  nombre: 'Juan',
  apellido: 'Test',
  rol: Rol.AGRICULTOR,
  esta_activo: true,
  tiene_2fa: false,
  totp_secret: '',
};

const mockUsuarioRepo = {
  findOne: jest.fn(),
  save: jest.fn().mockImplementation((u) => u),
};

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generateSecret', () => {
    it('debe generar QR y secret', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({ ...mockUsuario });

      const result = await service.generateSecret('uuid-user-1');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qr_code');
      expect(result).toHaveProperty('otpauth_url');
      expect(mockUsuarioRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar error si 2FA ya está activo', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        tiene_2fa: true,
      });

      await expect(
        service.generateSecret('uuid-user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar error si usuario no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);

      await expect(
        service.generateSecret('uuid-no'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verify', () => {
    it('debe activar 2FA con código válido', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        totp_secret: 'MOCK_SECRET',
      });
      otplib.authenticator.verify.mockReturnValue(true);

      const result = await service.verify('uuid-user-1', '123456');

      expect(result.mensaje).toBe('2FA activado correctamente');
    });

    it('debe lanzar error con código inválido', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        totp_secret: 'MOCK_SECRET',
      });
      otplib.authenticator.verify.mockReturnValue(false);

      await expect(
        service.verify('uuid-user-1', '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar error si no hay secret generado', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        totp_secret: '',
      });

      await expect(
        service.verify('uuid-user-1', '123456'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disable', () => {
    it('debe desactivar 2FA con código válido', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        tiene_2fa: true,
        totp_secret: 'MOCK_SECRET',
      });
      otplib.authenticator.verify.mockReturnValue(true);

      const result = await service.disable('uuid-user-1', '123456');

      expect(result.mensaje).toBe('2FA desactivado correctamente');
    });

    it('debe lanzar error si 2FA no está activo', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        tiene_2fa: false,
      });

      await expect(
        service.disable('uuid-user-1', '123456'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatus', () => {
    it('debe retornar estado del 2FA', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({ ...mockUsuario });

      const result = await service.getStatus('uuid-user-1');
      expect(result).toEqual({ tiene_2fa: false });
    });
  });
});