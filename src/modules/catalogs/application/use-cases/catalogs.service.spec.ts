import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { CatalogsService } from './catalogs.service';
import { CatTipoActividad } from '@modules/catalogs/domain/entities/cat-tipo-actividad.entity';
import { CatTipoAlerta } from '@modules/catalogs/domain/entities/cat-tipo-alerta.entity';
import { CatTipoRecomendacion } from '@modules/catalogs/domain/entities/cat-tipo-recomendacion.entity';
import { CatTipoInsumo } from '@modules/catalogs/domain/entities/cat-tipo-insumo.entity';

const mockItem = { id: 1, codigo: 'riego', nombre: 'Riego', descripcion: 'Aplicación de agua', activo: true };

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ id: 1, ...item })),
  remove: jest.fn(),
  count: jest.fn().mockResolvedValue(5),
});

describe('CatalogsService', () => {
  let service: CatalogsService;
  let tipoActividadRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    tipoActividadRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogsService,
        { provide: getRepositoryToken(CatTipoActividad), useValue: tipoActividadRepo },
        { provide: getRepositoryToken(CatTipoAlerta), useValue: mockRepo() },
        { provide: getRepositoryToken(CatTipoRecomendacion), useValue: mockRepo() },
        { provide: getRepositoryToken(CatTipoInsumo), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<CatalogsService>(CatalogsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debe retornar items del catálogo', async () => {
      tipoActividadRepo.find.mockResolvedValue([mockItem]);

      const result = await service.findAll('tipos-actividad');
      expect(result).toHaveLength(1);
      expect(tipoActividadRepo.find).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException para tipo inválido', async () => {
      await expect(service.findAll('tipo-invalido')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('debe retornar un item por ID', async () => {
      tipoActividadRepo.findOne.mockResolvedValue(mockItem);

      const result = await service.findOne('tipos-actividad', 1);
      expect(result).toEqual(mockItem);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      tipoActividadRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('tipos-actividad', 999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('debe crear un item nuevo', async () => {
      tipoActividadRepo.findOne.mockResolvedValue(null);

      const result = await service.create('tipos-actividad', {
        codigo: 'poda',
        nombre: 'Poda',
      });

      expect(result).toHaveProperty('codigo', 'poda');
      expect(tipoActividadRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el código ya existe', async () => {
      tipoActividadRepo.findOne.mockResolvedValue(mockItem);

      await expect(
        service.create('tipos-actividad', { codigo: 'riego', nombre: 'Riego' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('debe eliminar un item existente', async () => {
      tipoActividadRepo.findOne.mockResolvedValue(mockItem);
      tipoActividadRepo.remove.mockResolvedValue(undefined);

      await expect(
        service.remove('tipos-actividad', 1),
      ).resolves.toBeUndefined();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      tipoActividadRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('tipos-actividad', 999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResumen', () => {
    it('debe retornar conteo de todos los catálogos', async () => {
      const result = await service.getResumen();

      expect(result).toHaveProperty('tipos_actividad');
      expect(result).toHaveProperty('tipos_alerta');
      expect(result).toHaveProperty('tipos_recomendacion');
      expect(result).toHaveProperty('tipos_insumo');
    });
  });
});