import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { WhatsappService } from './whatsapp.service';
import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';

const mockSesion = {
  sesion_wa_id: 'uuid-sesion-1',
  wa_id: '573001234567',
  nombre_mostrado: 'Juan',
  estado_registro: 'desconocido',
  esta_bloqueado: false,
  primera_interaccion: new Date(),
  ultima_interaccion: new Date(),
};

const mockSesionRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockSesion, ...item })),
  remove: jest.fn(),
  count: jest.fn().mockResolvedValue(5),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(2),
  }),
};

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: getRepositoryToken(SesionWhatsapp), useValue: mockSesionRepo },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('create', () => {
    it('debe crear una sesión', async () => {
      mockSesionRepo.findOne.mockResolvedValue(null);
      await service.create({ wa_id: '573009999999' } as any);
      expect(mockSesionRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si wa_id ya existe', async () => {
      mockSesionRepo.findOne.mockResolvedValue(mockSesion);
      await expect(
        service.create({ wa_id: '573001234567' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('debe retornar sesión', async () => {
      mockSesionRepo.findOne.mockResolvedValue(mockSesion);
      const result = await service.findOne('uuid-sesion-1');
      expect(result.wa_id).toBe('573001234567');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockSesionRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrCreate', () => {
    it('debe retornar existente si ya existe', async () => {
      mockSesionRepo.findOne.mockResolvedValue(mockSesion);
      await service.findOrCreate('573001234567');
      expect(mockSesionRepo.save).toHaveBeenCalled();
    });

    it('debe crear nueva si no existe', async () => {
      mockSesionRepo.findOne
        .mockResolvedValueOnce(null)   // findByWaId
        .mockResolvedValueOnce(null);  // create -> findOne check
      await service.findOrCreate('573009999999', 'Nuevo');
      expect(mockSesionRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe eliminar sesión', async () => {
      mockSesionRepo.findOne.mockResolvedValue(mockSesion);
      await expect(service.remove('uuid-sesion-1')).resolves.toBeUndefined();
    });
  });

  describe('getResumen', () => {
    it('debe retornar estadísticas', async () => {
      const result = await service.getResumen();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('registrados');
      expect(result).toHaveProperty('bloqueados');
      expect(result).toHaveProperty('activos_24h');
    });
  });

  describe('pausarBot', () => {
      it('debe pausar el bot para un número', async () => {
          mockSesionRepo.findOne.mockResolvedValue({
              sesion_wa_id: 'uuid-1',
              wa_id: '573001234567',
              bot_pausado: false,
          });
          mockSesionRepo.save.mockResolvedValue({
              wa_id: '573001234567',
              bot_pausado: true,
          });
          const result = await service.pausarBot('573001234567', 30);
          expect(result.bot_pausado).toBe(true);
      });
  });

  describe('reanudarBot', () => {
      it('debe reanudar el bot para un número', async () => {
          mockSesionRepo.findOne.mockResolvedValue({
              sesion_wa_id: 'uuid-1',
              wa_id: '573001234567',
              bot_pausado: true,
          });
          mockSesionRepo.save.mockResolvedValue({
              wa_id: '573001234567',
              bot_pausado: false,
          });
          const result = await service.reanudarBot('573001234567');
          expect(result.bot_pausado).toBe(false);
      });
  });
});