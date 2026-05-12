import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { WeatherService } from './weather.service';
import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';

const mockParcela = {
  parcela_id: 'uuid-parcela-1',
  agricultor: { usuario_id: 'uuid-user-1' },
};

const mockDato = {
  dato_climatico_id: 'uuid-dato-1',
  parcela_id: 'uuid-parcela-1',
  fecha: new Date(),
  temp_maxima: 28,
  temp_minima: 15,
  temp_promedio: 21,
  precipitacion_mm: 12,
  humedad_pct: 78,
};

const mockDatoRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockDato, ...item })),
  remove: jest.fn(),
};

const mockParcelaRepo = {
  findOne: jest.fn(),
};

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: getRepositoryToken(DatoClimatico), useValue: mockDatoRepo },
        { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un dato climático', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      await service.create({
        parcela_id: 'uuid-parcela-1',
        fecha: '2026-04-20',
        fuente: 'openweathermap',
      } as any);

      expect(mockDatoRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si la parcela no existe', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ parcela_id: 'uuid-no', fecha: '2026-04-20', fuente: 'test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByParcela', () => {
    it('debe retornar datos climáticos', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockDatoRepo.find.mockResolvedValue([mockDato]);

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
    it('debe retornar un dato climático', async () => {
      mockDatoRepo.findOne.mockResolvedValue(mockDato);
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      const result = await service.findOne('uuid-dato-1', 'uuid-user-1', 'agricultor');
      expect(result.dato_climatico_id).toBe('uuid-dato-1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockDatoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('uuid-no', 'uuid-user-1', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUltimo', () => {
    it('debe retornar el último dato', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockDatoRepo.findOne.mockResolvedValue(mockDato);

      const result = await service.getUltimo('uuid-parcela-1', 'uuid-user-1', 'agricultor');
      expect(result).toBeDefined();
    });
  });

  describe('getPromedios', () => {
    it('debe retornar promedios calculados', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockDatoRepo.find.mockResolvedValue([mockDato, { ...mockDato, temp_promedio: 25, precipitacion_mm: 8, humedad_pct: 82 }]);

      const result = await service.getPromedios('uuid-parcela-1', '2026-01-01', '2026-04-30', 'uuid-user-1', 'agricultor');
      expect(result.dias_registrados).toBe(2);
      expect(result.temp_promedio).toBeGreaterThan(0);
    });

    it('debe retornar ceros si no hay datos', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockDatoRepo.find.mockResolvedValue([]);

      const result = await service.getPromedios('uuid-parcela-1', '2026-01-01', '2026-04-30', 'uuid-user-1', 'agricultor');
      expect(result).toEqual({ temp_promedio: 0, precipitacion_total: 0, humedad_promedio: 0, dias_registrados: 0 });
    });
  });

  describe('remove', () => {
    it('debe eliminar un dato climático', async () => {
      mockDatoRepo.findOne.mockResolvedValue(mockDato);
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);

      await expect(
        service.remove('uuid-dato-1', 'uuid-user-1', 'admin'),
      ).resolves.toBeUndefined();
    });
  });
});