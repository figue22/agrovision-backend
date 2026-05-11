import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

export interface SessionData {
  usuario_id: string;
  correo: string;
  rol: string;
  ip: string;
  user_agent: string;
  creado_en: string;
  ultimo_acceso: string;
}

@Injectable()
export class RedisSessionService {
  private readonly logger = new Logger(RedisSessionService.name);
  private readonly SESSION_PREFIX = 'session:';
  private readonly SESSION_TTL = 86400; // 24 horas

  constructor(private readonly cache: RedisCacheService) {}

  async createSession(
    sessionId: string,
    data: Omit<SessionData, 'creado_en' | 'ultimo_acceso'>,
  ): Promise<void> {
    const session: SessionData = {
      ...data,
      creado_en: new Date().toISOString(),
      ultimo_acceso: new Date().toISOString(),
    };

    await this.cache.set(
      `${this.SESSION_PREFIX}${sessionId}`,
      session,
      this.SESSION_TTL,
    );

    this.logger.log(`Sesión creada: ${data.correo}`);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.cache.get<SessionData>(
      `${this.SESSION_PREFIX}${sessionId}`,
    );
  }

  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.ultimo_acceso = new Date().toISOString();
      await this.cache.set(
        `${this.SESSION_PREFIX}${sessionId}`,
        session,
        this.SESSION_TTL,
      );
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.cache.del(`${this.SESSION_PREFIX}${sessionId}`);
    this.logger.log(`Sesión eliminada: ${sessionId}`);
  }

  async destroyUserSessions(_usuarioId: string): Promise<void> {
    await this.cache.delByPattern(`${this.SESSION_PREFIX}*`);
    this.logger.log('Sesiones eliminadas');
  }

  async isActive(sessionId: string): Promise<boolean> {
    return this.cache.exists(`${this.SESSION_PREFIX}${sessionId}`);
  }
}