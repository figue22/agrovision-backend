jest.mock('otplib', () => ({
  authenticator: {
    verify: jest.fn(),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AuthService } from './auth.service';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { Rol } from '@common/enums/enums';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn(),
  argon2id: 2,
}));

const argon2 = require('argon2');

const mockUsuario: Partial<Usuario> = {
  usuario_id: 'uuid-user-1',
  correo: 'test@test.com',
  contrasena_hash: 'hashed-password',
  nombre: 'Juan',
  apellido: 'Test',
  rol: Rol.AGRICULTOR,
  esta_activo: true,
  tiene_2fa: false,
  ultimo_login: undefined,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

const mockUsuarioRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockAgricultorRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((_key: string, defaultVal?: string) => defaultVal || 'test-secret'),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest.fn().mockImplementation((_entity, data) => data),
    save: jest.fn().mockImplementation((data) => ({ ...data, usuario_id: 'uuid-new' })),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
        { provide: getRepositoryToken(Agricultor), useValue: mockAgricultorRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('debe lanzar ConflictException si el correo ya existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);

      await expect(
        service.register({
          correo: 'test@test.com',
          contrasena: 'MiClave#2026',
          nombre: 'Juan',
          apellido: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe registrar usuario correctamente', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockResolvedValueOnce({
        ...mockUsuario,
        usuario_id: 'uuid-new',
      });

      const result = await service.register({
        correo: 'nuevo@test.com',
        contrasena: 'MiClave#2026',
        nombre: 'Nuevo',
        apellido: 'Usuario',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('usuario');
    });
  });

  describe('login', () => {
    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ correo: 'no@existe.com', contrasena: 'clave' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar ForbiddenException si la cuenta está deshabilitada', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        esta_activo: false,
      });

      await expect(
        service.login({ correo: 'test@test.com', contrasena: 'clave' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);
      argon2.verify.mockResolvedValue(false);

      await expect(
        service.login({ correo: 'test@test.com', contrasena: 'clave-mala' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe retornar tokens si las credenciales son correctas', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);
      mockUsuarioRepo.save.mockResolvedValue(mockUsuario);
      mockAgricultorRepo.findOne.mockResolvedValue(null);
      argon2.verify.mockResolvedValue(true);

      const result = await service.login({
        correo: 'test@test.com',
        contrasena: 'MiClave#2026',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('usuario');
    });

    it('debe retornar requiere_2fa si tiene 2FA activo', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        ...mockUsuario,
        tiene_2fa: true,
      });
      argon2.verify.mockResolvedValue(true);

      const result = await service.login({
        correo: 'test@test.com',
        contrasena: 'MiClave#2026',
      });

      expect(result).toHaveProperty('requiere_2fa', true);
    });
  });

  describe('refreshToken', () => {
    it('debe lanzar UnauthorizedException con token inválido', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refreshToken('token-malo'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe renovar tokens con refresh token válido', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-user-1',
        tipo: 'refresh',
      });
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);
      mockAgricultorRepo.findOne.mockResolvedValue(null);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });

  describe('getProfile', () => {
    it('debe retornar el usuario', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);

      const result = await service.getProfile('uuid-user-1');
      expect(result.correo).toBe('test@test.com');
    });

    it('debe lanzar UnauthorizedException si no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('uuid-no')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});