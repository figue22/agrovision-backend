jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, def: unknown) => def) },
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
    service.onModuleInit();
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('get', () => {
    it('debe retornar datos parseados', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ nombre: 'test' }));
      const result = await service.get('key');
      expect(result).toEqual({ nombre: 'test' });
    });

    it('debe retornar null si no existe', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const result = await service.get('no-existe');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('debe guardar con TTL', async () => {
      await service.set('key', { dato: 'valor' }, 300);
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', JSON.stringify({ dato: 'valor' }), 'EX', 300);
    });
  });

  describe('del', () => {
    it('debe eliminar key', async () => {
      await service.del('key');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('key');
    });
  });

  describe('delByPattern', () => {
    it('debe eliminar keys por patrón', async () => {
      mockRedisInstance.keys.mockResolvedValue(['s:1', 's:2']);
      await service.delByPattern('s:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('s:1', 's:2');
    });

    it('no debe llamar del si no hay keys', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);
      await service.delByPattern('nada:*');
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('debe retornar true si existe', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);
      expect(await service.exists('key')).toBe(true);
    });

    it('debe retornar false si no existe', async () => {
      mockRedisInstance.exists.mockResolvedValue(0);
      expect(await service.exists('no')).toBe(false);
    });
  });

  describe('ttl', () => {
    it('debe retornar TTL', async () => {
      mockRedisInstance.ttl.mockResolvedValue(3500);
      expect(await service.ttl('key')).toBe(3500);
    });
  });
});