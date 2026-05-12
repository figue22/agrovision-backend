jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  argon2id: 2,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

import { AdminService } from './admin.service';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { Rol } from '@common/enums/enums';

const mockUsuario = {
  usuario_id: 'uuid-user-1',
  correo: 'test@test.com',
  nombre: 'Juan',
  apellido: 'Test',
  rol: Rol.AGRICULTOR,
  esta_activo: true,
  creado_en: new Date(),
};

const mockTecnico = { ...mockUsuario, usuario_id: 'uuid-tecnico', rol: Rol.TECNICO };

const mockAgricultor = {
  agricultor_id: 'uuid-agri-1',
  usuario_id: 'uuid-user-1',
  cedula: '1053845678',
};

const mockAsignacion = {
  asignacion_id: 'uuid-asig-1',
  tecnico_id: 'uuid-tecnico',
  agricultor_id: 'uuid-agri-1',
  activa: true,
};

const mockUsuarioRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ usuario_id: 'uuid-new', ...item })),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([
      { rol: 'admin', total: '1' },
      { rol: 'agricultor', total: '10' },
    ]),
  }),
};

const mockAgriRepo = { findOne: jest.fn() };
const mockAsignacionRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockAsignacion, ...item })),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
        { provide: getRepositoryToken(Agricultor), useValue: mockAgriRepo },
        { provide: getRepositoryToken(AsignacionTecnico), useValue: mockAsignacionRepo },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('findAllUsers', () => {
    it('debe retornar usuarios', async () => {
      mockUsuarioRepo.find.mockResolvedValue([mockUsuario]);
      const result = await service.findAllUsers();
      expect(result).toHaveLength(1);
    });
  });

  describe('findUserById', () => {
    it('debe retornar usuario', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);
      const result = await service.findUserById('uuid-user-1');
      expect(result.correo).toBe('test@test.com');
    });

    it('debe lanzar NotFoundException', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      await expect(service.findUserById('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUser', () => {
    it('debe crear usuario', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      await service.createUser({
        correo: 'nuevo@test.com', contrasena: 'Clave#123', nombre: 'N', apellido: 'U', rol: Rol.TECNICO,
      });
      expect(mockUsuarioRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si correo existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);
      await expect(
        service.createUser({ correo: 'test@test.com', contrasena: 'C#123456', nombre: 'N', apellido: 'U', rol: Rol.TECNICO }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changeRole', () => {
    it('debe cambiar rol', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({ ...mockUsuario });
      await service.changeRole({ usuario_id: 'uuid-user-1', nuevo_rol: Rol.TECNICO }, 'uuid-admin');
      expect(mockUsuarioRepo.save).toHaveBeenCalled();
    });

    it('no puede cambiar su propio rol', async () => {
      await expect(
        service.changeRole({ usuario_id: 'uuid-admin', nuevo_rol: Rol.TECNICO }, 'uuid-admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleUserStatus', () => {
    it('debe cambiar estado', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({ ...mockUsuario });
      await service.toggleUserStatus({ usuario_id: 'uuid-user-1', esta_activo: false }, 'uuid-admin');
      expect(mockUsuarioRepo.save).toHaveBeenCalled();
    });

    it('no puede desactivarse a sí mismo', async () => {
      await expect(
        service.toggleUserStatus({ usuario_id: 'uuid-admin', esta_activo: false }, 'uuid-admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserStats', () => {
    it('debe retornar estadísticas', async () => {
      const result = await service.getUserStats();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('rol');
      expect(result[0]).toHaveProperty('total');
    });
  });

  describe('asignarAgricultor', () => {
    it('debe crear asignación', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockTecnico);
      mockAgriRepo.findOne.mockResolvedValue(mockAgricultor);
      mockAsignacionRepo.findOne.mockResolvedValue(null);

      await service.asignarAgricultor({ tecnico_id: 'uuid-tecnico', agricultor_id: 'uuid-agri-1' });
      expect(mockAsignacionRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar error si no es técnico', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario); // rol agricultor
      await expect(
        service.asignarAgricultor({ tecnico_id: 'uuid-user-1', agricultor_id: 'uuid-agri-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ConflictException si ya está asignado', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockTecnico);
      mockAgriRepo.findOne.mockResolvedValue(mockAgricultor);
      mockAsignacionRepo.findOne.mockResolvedValue(mockAsignacion);

      await expect(
        service.asignarAgricultor({ tecnico_id: 'uuid-tecnico', agricultor_id: 'uuid-agri-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('desasignarAgricultor', () => {
    it('debe desactivar asignación', async () => {
      mockAsignacionRepo.findOne.mockResolvedValue({ ...mockAsignacion });
      await service.desasignarAgricultor({ tecnico_id: 'uuid-tecnico', agricultor_id: 'uuid-agri-1' });
      expect(mockAsignacionRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockAsignacionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.desasignarAgricultor({ tecnico_id: 'uuid-no', agricultor_id: 'uuid-no' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});