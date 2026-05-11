import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface ChatMessage {
    rol: 'usuario' | 'asistente';
    contenido: string;
    timestamp: string;
}

export interface ChatResponse {
    conversacion_id: string;
    respuesta: string;
    fuentes?: string[];
    timestamp: string;
}

@Injectable()
export class ChatbotService {
    private readonly logger = new Logger(ChatbotService.name);
    // In-memory conversation store (en producción usar Redis)
    private readonly conversaciones = new Map<string, ChatMessage[]>();

    constructor() { }

    async sendMessage(
        usuarioId: string,
        mensaje: string,
        // parcelaId?: string,
        conversacionId?: string,
    ): Promise<ChatResponse> {
        const convId = conversacionId || randomUUID();

        // Obtener o crear historial
        if (!this.conversaciones.has(convId)) {
            this.conversaciones.set(convId, []);
        }

        const historial = this.conversaciones.get(convId) ?? [];
        this.conversaciones.set(convId, historial);

        // Agregar mensaje del usuario
        historial.push({
            rol: 'usuario',
            contenido: mensaje,
            timestamp: new Date().toISOString(),
        });

        // TODO: Integrar con servicio RAG (FastAPI agrovision-rag)
        // const ragUrl = this.configService.get('RAG_SERVICE_URL', 'http://localhost:8001');
        // const response = await axios.post(`${ragUrl}/api/v1/query`, {
        //   query: mensaje,
        //   parcela_id: parcelaId,
        //   historial: historial.slice(-10),
        // });

        // Respuesta placeholder hasta integración con RAG
        const respuesta = `[Chatbot AgroVision] Recibí tu consulta: "${mensaje}". ` +
            `La integración con el servicio RAG está pendiente. ` +
            `Cuando esté activa, recibirás recomendaciones basadas en documentos técnicos agrícolas.`;

        historial.push({
            rol: 'asistente',
            contenido: respuesta,
            timestamp: new Date().toISOString(),
        });

        // Limitar historial a últimas 50 interacciones
        if (historial.length > 50) {
            historial.splice(0, historial.length - 50);
        }

        this.logger.log(`Mensaje procesado para usuario ${usuarioId} en conv ${convId}`);

        return {
            conversacion_id: convId,
            respuesta,
            fuentes: [],
            timestamp: new Date().toISOString(),
        };
    }

    async getHistorial(conversacionId: string): Promise<ChatMessage[]> {
        return this.conversaciones.get(conversacionId) || [];
    }

    async clearConversation(conversacionId: string): Promise<{ cleared: boolean }> {
        const existed = this.conversaciones.has(conversacionId);
        this.conversaciones.delete(conversacionId);
        return { cleared: existed };
    }

    async getConversacionesActivas(): Promise<{ total: number }> {
        return { total: this.conversaciones.size };
    }
}