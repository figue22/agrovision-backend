import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ActivitiesService } from './activities.service';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';
import { InsumoActividad } from '@modules/activities/domain/entities/insumo-actividad.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';

const mockParcela = {
  parcela_id: 'uuid-parcela-1',
  nombre: 'Finca La Esperanza',
  agricultor: { usuario_id: 'uuid-user-1' },
};

const mockActividad = {
  actividad_id: 'uuid-act-1',
  parcela_id: 'uuid-parcela-1',
  tipo_actividad_id: 1,
  descripcion: 'Fertilización',
  costo_cop: 250000,
  fecha_realizacion: new Date(),
  tipoActividad: { nombre: 'Fertilización' },
  insumos: [],
  parcela: mockParcela,
};

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(mockActividad),
  getMany: jest.fn().mockResolvedValue([mockActividad]),
};

const mockActividadRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockActividad, ...item })),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockInsumoRepo = {
  create: jest.fn().mockImplementation((dto) => dto),
  delete: jest.fn(),
};

const mockParcelaRepo = {
  findOne: jest.fn(),
};

const mockEventEmitter = { emit: jest.fn() };

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: getRepositoryToken(Actividad), useValue: mockActividadRepo },
        { provide: getRepositoryToken(InsumoActividad), useValue: mockInsumoRepo },
        { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    jest.clearAllMocks();

    // Reset queryBuilder mocks
    mockQueryBuilder.getOne.mockResolvedValue(mockActividad);
    mockQueryBuilder.getMany.mockResolvedValue([mockActividad]);
    mockActividadRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una actividad', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      await service.create('uuid-user-1', 'agricultor', {
        parcela_id: 'uuid-parcela-1',
        tipo_actividad_id: 1,
        fecha_realizacion: '2026-04-20',
      } as any);

      expect(mockActividadRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si la parcela no existe', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('uuid-user-1', 'agricultor', {
          parcela_id: 'uuid-no',
          tipo_actividad_id: 1,
          fecha_realizacion: '2026-04-20',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si agricultor no es dueño', async () => {
      mockParcelaRepo.findOne.mockResolvedValue({
        ...mockParcela,
        agricultor: { usuario_id: 'uuid-otro' },
      });

      await expect(
        service.create('uuid-user-1', 'agricultor', {
          parcela_id: 'uuid-parcela-1',
          tipo_actividad_id: 1,
          fecha_realizacion: '2026-04-20',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByParcela', () => {
    it('debe retornar actividades de la parcela', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      const result = await service.findByParcela('uuid-parcela-1', 'uuid-user-1', 'agricultor');
      expect(result).toHaveLength(1);
    });

    it('debe lanzar ForbiddenException si agricultor no es dueño', async () => {
      mockParcelaRepo.findOne.mockResolvedValue({
        ...mockParcela,
        agricultor: { usuario_id: 'uuid-otro' },
      });

      await expect(
        service.findByParcela('uuid-parcela-1', 'uuid-user-1', 'agricultor'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('debe retornar una actividad', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      const result = await service.findOne('uuid-act-1', 'uuid-user-1', 'admin');
      expect(result.actividad_id).toBe('uuid-act-1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.findOne('uuid-no', 'uuid-user-1', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe actualizar una actividad', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      await service.update('uuid-act-1', 'uuid-user-1', 'agricultor', {
        descripcion: 'Nueva descripción',
      } as any);

      expect(mockActividadRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe eliminar una actividad', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      await expect(
        service.remove('uuid-act-1', 'uuid-user-1', 'agricultor'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getResumenParcela', () => {
    it('debe retornar resumen con totales', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockActividadRepo.find.mockResolvedValue([mockActividad]);

      const result = await service.getResumenParcela('uuid-parcela-1', 'uuid-user-1', 'agricultor');
      expect(result).toHaveProperty('total_actividades', 1);
      expect(result).toHaveProperty('costo_total_cop');
      expect(result).toHaveProperty('por_tipo');
    });
  });
});