import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { ParcelsService } from './parcels.service';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { Rol } from '@common/enums/enums';

const mockAgricultor = { agricultor_id: 'uuid-agri-1', usuario_id: 'uuid-user-1' };

const mockParcela = {
  parcela_id: 'uuid-parcela-1',
  agricultor_id: 'uuid-agri-1',
  nombre: 'Finca La Esperanza',
  ubicacion: { type: 'Point', coordinates: [-75.5, 5.07] },
  area_hectareas: 3.5,
  tipo_suelo: 'franco',
  creado_en: new Date(),
  agricultor: mockAgricultor,
};

const mockParcelaRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ parcela_id: 'uuid-new', ...item })),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
};

const mockAgriRepo = { findOne: jest.fn() };
const mockAsignacionRepo = { find: jest.fn(), findOne: jest.fn() };

describe('ParcelsService', () => {
  let service: ParcelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParcelsService,
        { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
        { provide: getRepositoryToken(Agricultor), useValue: mockAgriRepo },
        { provide: getRepositoryToken(AsignacionTecnico), useValue: mockAsignacionRepo },
      ],
    }).compile();

    service = module.get<ParcelsService>(ParcelsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('create', () => {
    it('debe crear parcela', async () => {
      mockAgriRepo.findOne.mockResolvedValue(mockAgricultor);
      mockParcelaRepo.save.mockResolvedValue(mockParcela);
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      const result = await service.create('uuid-user-1', {
        nombre: 'Finca Nueva',
        ubicacion: { latitud: 5.07, longitud: -75.5 },
        area_hectareas: 2,
      } as any);

      expect(result).toBeDefined();
    });

    it('debe lanzar ForbiddenException si no es agricultor', async () => {
      mockAgriRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create('uuid-no', { nombre: 'Test', ubicacion: { latitud: 5, longitud: -75 }, area_hectareas: 1 } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findMyParcelas', () => {
    it('debe retornar parcelas del agricultor', async () => {
      mockAgriRepo.findOne.mockResolvedValue(mockAgricultor);
      mockParcelaRepo.find.mockResolvedValue([mockParcela]);

      const result = await service.findMyParcelas('uuid-user-1');
      expect(result).toHaveLength(1);
    });

    it('debe lanzar ForbiddenException si no es agricultor', async () => {
      mockAgriRepo.findOne.mockResolvedValue(null);
      await expect(service.findMyParcelas('uuid-no')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('admin puede ver cualquier parcela', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      const result = await service.findOne('uuid-parcela-1', 'uuid-admin', Rol.ADMIN);
      expect(result).toBeDefined();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('uuid-no', 'uuid-user-1', Rol.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('agricultor no dueño lanza ForbiddenException', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockAgriRepo.findOne.mockResolvedValue({ agricultor_id: 'uuid-otro', usuario_id: 'uuid-otro' });

      await expect(
        service.findOne('uuid-parcela-1', 'uuid-otro', Rol.AGRICULTOR),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('admin puede eliminar', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      await expect(
        service.remove('uuid-parcela-1', 'uuid-admin', Rol.ADMIN),
      ).resolves.toBeUndefined();
    });

    it('debe lanzar NotFoundException', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.remove('uuid-no', 'uuid-admin', Rol.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('admin ve todas', async () => {
      mockParcelaRepo.find.mockResolvedValue([mockParcela]);
      const result = await service.findAll('uuid-admin', Rol.ADMIN);
      expect(result).toHaveLength(1);
    });

    it('técnico sin asignaciones ve vacío', async () => {
      mockAsignacionRepo.find.mockResolvedValue([]);
      const result = await service.findAll('uuid-tecnico', Rol.TECNICO);
      expect(result).toHaveLength(0);
    });
  });
});