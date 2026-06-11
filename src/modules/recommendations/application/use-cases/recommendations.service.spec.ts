import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { RecommendationsService } from './recommendations.service';
import { Recomendacion } from '@modules/recommendations/domain/entities/recomendacion.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CatTipoRecomendacion } from '@modules/catalogs/domain/entities/cat-tipo-recomendacion.entity';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';
import { Rol } from '@common/enums/enums';

const mockPrediccion = {
  prediccion_id: 'uuid-pred-1',
  parcela_id: 'uuid-parcela-1',
  rendimiento_predicho_ton: 1.5,
  nivel_riesgo: 'medio',
  factores_riesgo: {},
  datos_clima_usados: {},
};

const mockActividadRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    }),
};

const mockParcela = { parcela_id: 'uuid-parcela-1', agricultor: { usuario_id: 'uuid-user-1' } };
const mockRec = {
  recomendacion_id: 'uuid-rec-1',
  prediccion_id: 'uuid-pred-1',
  titulo: 'Aumentar riego',
  prioridad: 'alta',
  prediccion: { parcela_id: 'uuid-parcela-1', parcela: mockParcela },
};

const mockRecRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockRec, ...item })),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
};

const mockPredRepo = { findOne: jest.fn() };
const mockParcelaRepo = { findOne: jest.fn() };
const mockTipoRecomRepo = {
  find: jest.fn().mockResolvedValue([
    { id: 1, codigo: 'fertilizacion', nombre: 'Fertilización' },
    { id: 2, codigo: 'riego', nombre: 'Riego' },
    { id: 3, codigo: 'plagas', nombre: 'Plagas' },
    { id: 4, codigo: 'siembra', nombre: 'Siembra' },
    { id: 5, codigo: 'cosecha', nombre: 'Cosecha' },
    { id: 6, codigo: 'general', nombre: 'General' },
  ]),
};
const mockActividadRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue({}),
};

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getRepositoryToken(Recomendacion), useValue: mockRecRepo },
        { provide: getRepositoryToken(Prediccion), useValue: mockPredRepo },
        { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
        { provide: getRepositoryToken(CatTipoRecomendacion), useValue: mockTipoRecomRepo },
        { provide: getRepositoryToken(Actividad), useValue: mockActividadRepo },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('create', () => {
    it('debe crear recomendación', async () => {
      mockPredRepo.findOne.mockResolvedValue(mockPrediccion);
      await service.create({ prediccion_id: 'uuid-pred-1', titulo: 'Test' } as any);
      expect(mockRecRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si predicción no existe', async () => {
      mockPredRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ prediccion_id: 'uuid-no' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generarParaPrediccion', () => {
    it('debe generar recomendaciones para predicción', async () => {
      mockPredRepo.findOne.mockResolvedValue(mockPrediccion);
      mockRecRepo.delete.mockResolvedValue({});
      mockTipoRecomRepo.find.mockResolvedValue([
        { id: 1, codigo: 'fertilizacion' },
        { id: 2, codigo: 'riego' },
        { id: 3, codigo: 'plagas' },
        { id: 5, codigo: 'cosecha' },
        { id: 6, codigo: 'general' },
      ]);

      const result = await service.generarParaPrediccion('uuid-pred-1');
      expect(result.length).toBeGreaterThan(0);
      expect(mockRecRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si predicción no existe', async () => {
      mockPredRepo.findOne.mockResolvedValue(null);
      await expect(
        service.generarParaPrediccion('uuid-no'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPrediccion', () => {
    it('debe retornar recomendaciones', async () => {
      mockPredRepo.findOne.mockResolvedValue(mockPrediccion);
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockRecRepo.find.mockResolvedValue([mockRec]);
      const result = await service.findByPrediccion('uuid-pred-1', 'uuid-user-1', Rol.AGRICULTOR);
      expect(result).toHaveLength(1);
    });

    it('debe lanzar NotFoundException si predicción no existe', async () => {
      mockPredRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findByPrediccion('uuid-no', 'uuid-user-1', Rol.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('debe retornar recomendación', async () => {
      mockRecRepo.findOne.mockResolvedValue(mockRec);
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      const result = await service.findOne('uuid-rec-1', 'uuid-user-1', Rol.ADMIN);
      expect(result.titulo).toBe('Aumentar riego');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockRecRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('uuid-no', 'uuid-user-1', Rol.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debe eliminar recomendación', async () => {
      mockRecRepo.findOne.mockResolvedValue(mockRec);
      await expect(service.remove('uuid-rec-1')).resolves.toBeUndefined();
    });

    it('debe lanzar NotFoundException', async () => {
      mockRecRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('debe retornar lista', async () => {
      mockRecRepo.find.mockResolvedValue([mockRec]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });
});