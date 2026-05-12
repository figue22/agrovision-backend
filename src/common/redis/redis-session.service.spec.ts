import { RedisSessionService } from './redis-session.service';
import { RedisCacheService } from './redis-cache.service';

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  exists: jest.fn(),
} as unknown as jest.Mocked<RedisCacheService>;

describe('RedisSessionService', () => {
  let service: RedisSessionService;

  beforeEach(() => {
    service = new RedisSessionService(mockCache);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('createSession', () => {
    it('debe guardar con TTL 24h', async () => {
      await service.createSession('sess-1', {
        usuario_id: 'u-1', correo: 'test@test.com', rol: 'agricultor', ip: '127.0.0.1', user_agent: 'Mozilla',
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        'session:sess-1',
        expect.objectContaining({ usuario_id: 'u-1' }),
        86400,
      );
    });
  });

  describe('getSession', () => {
    it('debe retornar sesión', async () => {
      mockCache.get.mockResolvedValue({ usuario_id: 'u-1', correo: 'test@test.com' });
      const result = await service.getSession('sess-1');
      expect(result).toHaveProperty('usuario_id');
    });

    it('debe retornar null si no existe', async () => {
      mockCache.get.mockResolvedValue(null);
      const result = await service.getSession('no');
      expect(result).toBeNull();
    });
  });

  describe('destroySession', () => {
    it('debe eliminar sesión', async () => {
      await service.destroySession('sess-1');
      expect(mockCache.del).toHaveBeenCalledWith('session:sess-1');
    });
  });

  describe('isActive', () => {
    it('debe verificar existencia', async () => {
      mockCache.exists.mockResolvedValue(true);
      expect(await service.isActive('sess-1')).toBe(true);
    });
  });

  describe('touchSession', () => {
    it('debe renovar TTL', async () => {
      mockCache.get.mockResolvedValue({ usuario_id: 'u-1', ultimo_acceso: '2026-01-01' });
      await service.touchSession('sess-1');
      expect(mockCache.set).toHaveBeenCalledWith('session:sess-1', expect.anything(), 86400);
    });
  });
});