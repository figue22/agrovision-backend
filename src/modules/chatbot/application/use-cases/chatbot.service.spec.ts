import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { ChatbotService } from './chatbot.service';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { RedisCacheService } from '@common/redis/redis-cache.service';

const mockParcelaRepo = { find: jest.fn().mockResolvedValue([]) };
const mockPrediccionRepo = { find: jest.fn().mockResolvedValue([]) };
const mockAlertaRepo = { find: jest.fn().mockResolvedValue([]) };

const mockRedisCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:8002'),
};

describe('ChatbotService', () => {
  let service: ChatbotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisCacheService, useValue: mockRedisCache },
        { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
        { provide: getRepositoryToken(Prediccion), useValue: mockPrediccionRepo },
        { provide: getRepositoryToken(Alerta), useValue: mockAlertaRepo },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('sendMessage', () => {
    xdescribe('sendMessage', () => {
      const result = await service.sendMessage('uuid-user-1', 'Hola');
      expect(result).toHaveProperty('conversacion_id');
      expect(result).toHaveProperty('respuesta');
      expect(result.tipo).toBe('saludo');
    });

    it('debe mantener conversacion_id en mismo hilo', async () => {
      const r1 = await service.sendMessage('uuid-user-1', 'Hola');
      const r2 = await service.sendMessage('uuid-user-1', 'Segunda consulta', r1.conversacion_id);
      expect(r2.conversacion_id).toBe(r1.conversacion_id);
    });
  });

  describe('getHistorialPublico', () => {
    it('debe retornar vacío para conversación inexistente', async () => {
      const result = await service.getHistorialPublico('uuid-no-existe');
      expect(result).toHaveLength(0);
    });
  });

  describe('clearConversation', () => {
    it('debe limpiar conversación', async () => {
      const result = await service.clearConversation('uuid-conv-1');
      expect(result).toHaveProperty('cleared');
    });
  });

  describe('getConversacionesActivas', () => {
    it('debe retornar conteo', async () => {
      const result = await service.getConversacionesActivas();
      expect(result).toHaveProperty('total');
    });
  });
});