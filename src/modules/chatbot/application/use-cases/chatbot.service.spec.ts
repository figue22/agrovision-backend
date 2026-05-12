import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;

  beforeEach(() => {
    service = new ChatbotService();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('sendMessage', () => {
    it('debe retornar respuesta con conversacion_id', async () => {
      const result = await service.sendMessage('uuid-user-1', 'Hola');
      expect(result).toHaveProperty('conversacion_id');
      expect(result).toHaveProperty('respuesta');
      expect(result.respuesta).toContain('Hola');
    });

    it('debe mantener historial con mismo conversacion_id', async () => {
      const r1 = await service.sendMessage('uuid-user-1', 'Primer mensaje');
      const r2 = await service.sendMessage('uuid-user-1', 'Segundo', r1.conversacion_id);
      expect(r2.conversacion_id).toBe(r1.conversacion_id);

      const historial = await service.getHistorial(r1.conversacion_id);
      expect(historial.length).toBe(4); // 2 usuario + 2 asistente
    });
  });

  describe('getHistorial', () => {
    it('debe retornar vacío para conversación inexistente', async () => {
      const result = await service.getHistorial('uuid-no-existe');
      expect(result).toHaveLength(0);
    });
  });

  describe('clearConversation', () => {
    it('debe limpiar conversación existente', async () => {
      const msg = await service.sendMessage('uuid-user-1', 'Test');
      const result = await service.clearConversation(msg.conversacion_id);
      expect(result.cleared).toBe(true);

      const historial = await service.getHistorial(msg.conversacion_id);
      expect(historial).toHaveLength(0);
    });

    it('debe retornar false para conversación inexistente', async () => {
      const result = await service.clearConversation('uuid-no');
      expect(result.cleared).toBe(false);
    });
  });

  describe('getConversacionesActivas', () => {
    it('debe retornar conteo', async () => {
      await service.sendMessage('uuid-user-1', 'Test');
      const result = await service.getConversacionesActivas();
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });
});