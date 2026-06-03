import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { PredictionsService } from './predictions.service';
import { MlService } from './ml.service';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Rol } from '@common/enums/enums';

const mockParcela = { parcela_id: 'uuid-parcela-1', agricultor: { usuario_id: 'uuid-user-1' } };
const mockPrediccion = {
  prediccion_id: 'uuid-pred-1',
  parcela_id: 'uuid-parcela-1',
  rendimiento_predicho_ton: 4.85,
  nivel_riesgo: 'medio',
  fecha_prediccion: new Date(),
};

const mockPredRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockPrediccion, ...item })),
  remove: jest.fn(),
};

const mockParcelaRepo = { findOne: jest.fn() };

const mockMlService = {
  predict: jest.fn().mockResolvedValue({
    version_modelo: '1.0.0',
    tipo_modelo: 'ensemble',
    rendimiento_predicho_ton: 1.5,
    puntaje_confianza: 85,
    intervalo_conf_inferior: 1.35,
    intervalo_conf_superior: 1.65,
    nivel_riesgo: 'medio',
    factores_riesgo: {},
    datos_clima_usados: {},
    importancia_features: {},
    fecha_prediccion: new Date().toISOString(),
  }),
};

describe('PredictionsService', () => {
  let service: PredictionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionsService,
        { provide: getRepositoryToken(Prediccion), useValue: mockPredRepo },
        { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
        { provide: MlService, useValue: mockMlService },
      ],
    }).compile();

    service = module.get<PredictionsService>(PredictionsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('create', () => {
    it('debe crear una predicción', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      await service.create({ parcela_id: 'uuid-parcela-1' } as any, 'uuid-user-1', Rol.AGRICULTOR);
      expect(mockPredRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si parcela no existe', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ parcela_id: 'uuid-no' } as any, 'uuid-user-1', Rol.AGRICULTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByParcela', () => {
    it('debe retornar predicciones', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockPredRepo.find.mockResolvedValue([mockPrediccion]);
      const result = await service.findByParcela('uuid-parcela-1', 'uuid-user-1', Rol.AGRICULTOR);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException si no existe', async () => {
      mockPredRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('uuid-no', 'uuid-user-1', Rol.ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe actualizar predicción', async () => {
      mockPredRepo.findOne.mockResolvedValue(mockPrediccion);
      await service.update('uuid-pred-1', { rendimiento_predicho_ton: 5.0 } as any);
      expect(mockPredRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe eliminar predicción', async () => {
      mockPredRepo.findOne.mockResolvedValue(mockPrediccion);
      await expect(service.remove('uuid-pred-1')).resolves.toBeUndefined();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPredRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });
});