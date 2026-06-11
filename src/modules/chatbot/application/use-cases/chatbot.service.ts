import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import axios from 'axios';

export interface ChatMessage {
    rol: 'usuario' | 'asistente';
    contenido: string;
    timestamp: string;
}

export interface ChatResponse {
    conversacion_id: string;
    respuesta: string;
    fuentes?: { titulo: string; pagina?: number; score: number }[];
    tipo: string;
    timestamp: string;
}

@Injectable()
export class ChatbotService {
    private readonly logger = new Logger(ChatbotService.name);
    private readonly conversaciones = new Map<string, ChatMessage[]>();
    private readonly ragUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.ragUrl = this.configService.get<string>('RAG_SERVICE_URL', 'http://localhost:8002');
    }

    async sendMessage(
        usuarioId: string,
        mensaje: string,
        conversacionId?: string,
        contexto?: {
            cultivo?: string;
            region?: string;
            nombreUsuario?: string;
        },
    ): Promise<ChatResponse> {
        const convId = conversacionId || randomUUID();

        if (!this.conversaciones.has(convId)) {
            this.conversaciones.set(convId, []);
        }
        const historial = this.conversaciones.get(convId)!;

        // Agregar mensaje del usuario al historial
        historial.push({
            rol: 'usuario',
            contenido: mensaje,
            timestamp: new Date().toISOString(),
        });

        let respuesta = '';
        let fuentes: any[] = [];
        let tipo = 'rag';

        try {
            // Enviar al RAG con historial — sin el mensaje actual (último elemento)
            const historialParaRAG = historial
                .slice(0, -1)   // todos menos el ultimo (el que acabamos de agregar)
                .slice(-6)      // ultimos 6 mensajes
                .map(m => ({ rol: m.rol, contenido: m.contenido }));

            const ragResponse = await axios.post(
                `${this.ragUrl}/query`,
                {
                    pregunta: mensaje,
                    top_k: 5,
                    cultivo: contexto?.cultivo || undefined,
                    region: contexto?.region || undefined,
                    historial: historialParaRAG.length > 0 ? historialParaRAG : undefined,
                },
                { timeout: 30000 },
            );

            respuesta = ragResponse.data.respuesta;
            fuentes = (ragResponse.data.fuentes || []).map((f: any) => ({
                titulo: f.titulo,
                pagina: f.pagina,
                score: f.score,
            }));
            tipo = 'rag';

            this.logger.log(
                `RAG OK | conv=${convId} | fuentes=${fuentes.length} | usuario=${usuarioId}`,
            );

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error llamando al RAG: ${msg}`);
            respuesta = 'Lo siento, el asistente no está disponible en este momento. Intenta de nuevo más tarde.';
            tipo = 'error';
        }

        // Guardar respuesta en historial
        historial.push({
            rol: 'asistente',
            contenido: respuesta,
            timestamp: new Date().toISOString(),
        });

        // Limitar a 50 mensajes
        if (historial.length > 50) {
            historial.splice(0, historial.length - 50);
        }

        return {
            conversacion_id: convId,
            respuesta,
            fuentes,
            tipo,
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