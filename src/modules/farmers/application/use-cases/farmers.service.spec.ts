import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { FarmersService } from './farmers.service';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { Rol } from '@common/enums/enums';

const mockAgricultor = {
  agricultor_id: 'uuid-agri-1',
  usuario_id: 'uuid-user-1',
  cedula: '1053845678',
  municipio: 'Manizales',
  departamento: 'Caldas',
  usuario: { correo: 'test@test.com' },
};

const mockAgriRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockImplementation((item) => item),
};

const mockAsignacionRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('FarmersService', () => {
  let service: FarmersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmersService,
        { provide: getRepositoryToken(Agricultor), useValue: mockAgriRepo },
        { provide: getRepositoryToken(AsignacionTecnico), useValue: mockAsignacionRepo },
      ],
    }).compile();

    service = module.get<FarmersService>(FarmersService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findByUsuarioId', () => {
    it('debe retornar agricultor', async () => {
      mockAgriRepo.findOne.mockResolvedValue(mockAgricultor);
      const result = await service.findByUsuarioId('uuid-user-1');
      expect(result.cedula).toBe('1053845678');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockAgriRepo.findOne.mockResolvedValue(null);
      await expect(service.findByUsuarioId('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe actualizar agricultor', async () => {
      mockAgriRepo.findOne.mockResolvedValue({ ...mockAgricultor });
      await service.update('uuid-user-1', { municipio: 'Chinchiná' });
      expect(mockAgriRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('admin debe ver todos', async () => {
      mockAgriRepo.find.mockResolvedValue([mockAgricultor]);
      const result = await service.findAll('uuid-admin', Rol.ADMIN);
      expect(result).toHaveLength(1);
    });

    it('técnico debe ver solo sus asignados', async () => {
      mockAsignacionRepo.find.mockResolvedValue([{ agricultor: mockAgricultor }]);
      const result = await service.findAll('uuid-tecnico', Rol.TECNICO);
      expect(result).toHaveLength(1);
    });

    it('agricultor retorna vacío', async () => {
      const result = await service.findAll('uuid-agri', Rol.AGRICULTOR);
      expect(result).toHaveLength(0);
    });
  });

  describe('findByIdConAcceso', () => {
    it('admin puede ver cualquiera', async () => {
      mockAgriRepo.findOne.mockResolvedValue(mockAgricultor);
      const result = await service.findByIdConAcceso('uuid-agri-1', 'uuid-admin', Rol.ADMIN);
      expect(result).toBeDefined();
    });

    it('técnico sin asignación lanza ForbiddenException', async () => {
      mockAgriRepo.findOne.mockResolvedValue(mockAgricultor);
      mockAsignacionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdConAcceso('uuid-agri-1', 'uuid-tecnico', Rol.TECNICO),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});