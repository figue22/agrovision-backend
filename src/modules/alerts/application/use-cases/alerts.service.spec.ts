import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { AlertsService } from './alerts.service';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockAlerta = {
  alerta_id: 'uuid-alerta-1',
  usuario_id: 'uuid-user-1',
  parcela_id: 'uuid-parcela-1',
  tipo_alerta_id: 1,
  severidad: 'alta',
  titulo: 'Alerta de helada',
  mensaje: 'Temperaturas bajo 0',
  esta_leida: false,
  fecha_lectura: null,
  creado_en: new Date(),
};

const mockEventEmitter = {
    emit: jest.fn(),
};

const mockAlertaRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockAlerta, ...item })),
  remove: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
};

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alerta), useValue: mockAlertaRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una alerta', async () => {
      const dto = {
        usuario_id: 'uuid-user-1',
        tipo_alerta_id: 1,
        severidad: 'alta' as const,
        titulo: 'Test',
        mensaje: 'Mensaje test',
      };

      const result = await service.create(dto as any);
      expect(result).toHaveProperty('titulo');
      expect(mockAlertaRepo.save).toHaveBeenCalled();
    });
  });

  describe('findMyAlerts', () => {
    it('debe retornar alertas del usuario', async () => {
      mockAlertaRepo.find.mockResolvedValue([mockAlerta]);

      const result = await service.findMyAlerts('uuid-user-1');
      expect(result).toHaveLength(1);
      expect(mockAlertaRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuario_id: 'uuid-user-1' },
        }),
      );
    });
  });

  describe('countUnread', () => {
    it('debe retornar conteo de no leídas', async () => {
      mockAlertaRepo.count.mockResolvedValue(3);

      const result = await service.countUnread('uuid-user-1');
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('findOne', () => {
    it('debe retornar alerta si el usuario es dueño', async () => {
      mockAlertaRepo.findOne.mockResolvedValue(mockAlerta);

      const result = await service.findOne('uuid-alerta-1', 'uuid-user-1', 'agricultor');
      expect(result.alerta_id).toBe('uuid-alerta-1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockAlertaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('uuid-no', 'uuid-user-1', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si agricultor no es dueño', async () => {
      mockAlertaRepo.findOne.mockResolvedValue({
        ...mockAlerta,
        usuario_id: 'uuid-otro',
      });

      await expect(
        service.findOne('uuid-alerta-1', 'uuid-user-1', 'agricultor'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsRead', () => {
    it('debe marcar alerta como leída', async () => {
      mockAlertaRepo.findOne.mockResolvedValue({ ...mockAlerta });

      const result = await service.markAsRead('uuid-alerta-1', 'uuid-user-1');
      expect(result.esta_leida).toBe(true);
      expect(result.fecha_lectura).toBeDefined();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockAlertaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.markAsRead('uuid-no', 'uuid-user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('debe retornar cantidad de alertas actualizadas', async () => {
      mockAlertaRepo.update.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead('uuid-user-1');
      expect(result).toEqual({ updated: 5 });
    });
  });

  describe('remove', () => {
    it('debe eliminar una alerta', async () => {
      mockAlertaRepo.findOne.mockResolvedValue(mockAlerta);
      mockAlertaRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove('uuid-alerta-1')).resolves.toBeUndefined();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockAlertaRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });
});