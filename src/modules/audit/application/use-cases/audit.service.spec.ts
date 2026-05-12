import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuditService } from './audit.service';
import { LogAuditoria } from '@modules/audit/domain/entities/log-auditoria.entity';

const mockLog = {
  log_id: 'uuid-log-1',
  usuario_id: 'uuid-user-1',
  accion: 'CREATE',
  tipo_entidad: 'parcela',
  id_entidad: 'uuid-parcela-1',
  creado_en: new Date(),
};

const mockLogRepo = {
  find: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockLog, ...item })),
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(LogAuditoria), useValue: mockLogRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('log', () => {
    it('debe crear un log', async () => {
      await service.log({ accion: 'CREATE', tipo_entidad: 'parcela' } as any);
      expect(mockLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debe retornar logs', async () => {
      mockLogRepo.find.mockResolvedValue([mockLog]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findByUsuario', () => {
    it('debe filtrar por usuario', async () => {
      mockLogRepo.find.mockResolvedValue([mockLog]);
      await service.findByUsuario('uuid-user-1');
      expect(mockLogRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuario_id: 'uuid-user-1' } }),
      );
    });
  });

  describe('findByEntidad', () => {
    it('debe filtrar por entidad', async () => {
      mockLogRepo.find.mockResolvedValue([mockLog]);
      await service.findByEntidad('parcela', 'uuid-parcela-1');
      expect(mockLogRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tipo_entidad: 'parcela', id_entidad: 'uuid-parcela-1' },
        }),
      );
    });
  });
});