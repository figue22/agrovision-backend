import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

import { CropsService } from './crops.service';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { Rol } from '@common/enums/enums';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Recomendacion } from '@modules/recommendations/domain/entities/recomendacion.entity';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';

const mockTipoCultivo = {
  tipo_cultivo_id: 'uuid-tipo-1',
  nombre: 'Café',
  categoria: 'permanente',
  dias_crecimiento_prom: 365,
  temp_optima_min: 18,
  temp_optima_max: 24,
  ph_optimo_min: 5.0,
  ph_optimo_max: 5.5,
};

const mockParcela = {
  parcela_id: 'uuid-parcela-1',
  agricultor_id: 'uuid-agri-1',
  area_hectareas: 5,
};

const mockTipoRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ tipo_cultivo_id: 'uuid-new', ...item })),
  remove: jest.fn(),
};

const mockCultivoRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ cultivo_parcela_id: 'uuid-cp-1', ...item })),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
};

const mockPrediccionRepo = {
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
};

const mockRecomendacionRepo = {
    delete: jest.fn().mockResolvedValue({}),
};

const mockActividadRepo = {
    delete: jest.fn().mockResolvedValue({}),
};

const mockParcelaRepo = { findOne: jest.fn() };
const mockAgriRepo = { findOne: jest.fn() };
const mockAsignacionRepo = { find: jest.fn(), findOne: jest.fn() };

describe('CropsService', () => {
  let service: CropsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CropsService,
        { provide: getRepositoryToken(TipoCultivo), useValue: mockTipoRepo },
        { provide: getRepositoryToken(CultivoParcela), useValue: mockCultivoRepo },
        { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
        { provide: getRepositoryToken(Agricultor), useValue: mockAgriRepo },
        { provide: getRepositoryToken(AsignacionTecnico), useValue: mockAsignacionRepo },
        { provide: getRepositoryToken(Prediccion), useValue: mockPrediccionRepo },
        { provide: getRepositoryToken(Recomendacion), useValue: mockRecomendacionRepo },
        { provide: getRepositoryToken(Actividad), useValue: mockActividadRepo },
      ],
    }).compile();

    service = module.get<CropsService>(CropsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('findAll', () => {
    it('debe retornar tipos de cultivo', async () => {
      mockTipoRepo.find.mockResolvedValue([mockTipoCultivo]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('debe retornar tipo por ID', async () => {
      mockTipoRepo.findOne.mockResolvedValue(mockTipoCultivo);
      const result = await service.findById('uuid-tipo-1');
      expect(result.nombre).toBe('Café');
    });

    it('debe lanzar NotFoundException', async () => {
      mockTipoRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create (tipo cultivo)', () => {
    it('debe crear tipo', async () => {
      mockTipoRepo.findOne.mockResolvedValue(null);
      await service.create({ nombre: 'Maíz' } as any);
      expect(mockTipoRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si nombre existe', async () => {
      mockTipoRepo.findOne.mockResolvedValue(mockTipoCultivo);
      await expect(service.create({ nombre: 'Café' } as any)).rejects.toThrow(ConflictException);
    });

    it('debe validar temp_min < temp_max', async () => {
      mockTipoRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ nombre: 'Test', temp_optima_min: 30, temp_optima_max: 20 } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove (tipo cultivo)', () => {
    it('debe eliminar', async () => {
      mockTipoRepo.findOne.mockResolvedValue(mockTipoCultivo);
      await expect(service.remove('uuid-tipo-1')).resolves.toBeUndefined();
    });
  });

  describe('createCultivoParcela', () => {
    it('debe crear cultivo en parcela', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(mockParcela);
      mockAgriRepo.findOne.mockResolvedValue({ agricultor_id: 'uuid-agri-1', usuario_id: 'uuid-user-1' });
      mockTipoRepo.findOne.mockResolvedValue(mockTipoCultivo);
      mockCultivoRepo.findOne.mockResolvedValue({ cultivo_parcela_id: 'uuid-cp-1', parcela: mockParcela, tipoCultivo: mockTipoCultivo });

      await service.createCultivoParcela({
        parcela_id: 'uuid-parcela-1',
        tipo_cultivo_id: 'uuid-tipo-1',
        fecha_siembra: '2026-03-01',
      } as any, 'uuid-user-1', Rol.AGRICULTOR);

      expect(mockCultivoRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si parcela no existe', async () => {
      mockParcelaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createCultivoParcela({ parcela_id: 'uuid-no', tipo_cultivo_id: 'uuid-tipo-1', fecha_siembra: '2026-03-01' } as any, 'uuid-user-1', Rol.AGRICULTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyCultivos', () => {
    it('debe lanzar ForbiddenException si no es agricultor', async () => {
      mockAgriRepo.findOne.mockResolvedValue(null);
      await expect(service.findMyCultivos('uuid-no')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeCultivoParcela', () => {
    it('debe lanzar NotFoundException si cultivo no existe', async () => {
      mockCultivoRepo.findOne.mockResolvedValue(null);
      await expect(
        service.removeCultivoParcela('uuid-no', 'uuid-user-1', Rol.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});