import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import axios from 'axios';

import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { RedisCacheService } from '@common/redis/redis-cache.service';

export interface ChatMessage {
    rol: 'usuario' | 'asistente';
    contenido: string;
    timestamp: string;
    fuentes?: { titulo: string; pagina?: number; score: number }[];
    tipo?: 'rag' | 'prediccion' | 'alerta' | 'clima' | 'actividad' | 'recomendacion' | 'general' | 'saludo';
}

export interface ChatResponse {
    conversacion_id: string;
    respuesta: string;
    fuentes?: { titulo: string; pagina?: number; score: number }[];
    tipo: string;
    timestamp: string;
}

type IntentType = 'prediccion' | 'alerta' | 'clima' | 'actividad' | 'recomendacion' | 'rag';

@Injectable()
export class ChatbotService {
    private readonly logger = new Logger(ChatbotService.name);
    private readonly ragUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisCache: RedisCacheService,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
        @InjectRepository(Prediccion)
        private readonly prediccionRepo: Repository<Prediccion>,
        @InjectRepository(Alerta)
        private readonly alertaRepo: Repository<Alerta>,
    ) {
        this.ragUrl = this.configService.get<string>('RAG_SERVICE_URL', 'http://localhost:8002');
    }

    // ── Intent Detection ──
    private detectIntent(mensaje: string): IntentType {
        const msg = mensaje.toLowerCase();

        if (/^(hola|buenas|buenos|buen dia|hi|hello)/.test(msg)) return 'saludo' as IntentType;
        if (/predic|rendimiento|cosecha|produccion|tonelada/.test(msg)) return 'prediccion';
        if (/alerta|lluvia|helada|sequia|viento|plaga|riesgo/.test(msg)) return 'alerta';
        if (/clima|temperatura|humedad|precipitacion|pronostico|llueve/.test(msg)) return 'clima';
        if (/actividad|fertiliz|riego|fumiga|poda|siembra|insumo/.test(msg)) return 'actividad';
        if (/recomend|consejo|que hago|como mejorar|sugerencia/.test(msg)) return 'recomendacion';

        return 'rag';
    }

    // ── Obtener historial desde Redis ──
    private async getHistorial(conversacionId: string): Promise<ChatMessage[]> {
        try {
            const data = await this.redisCache.get<ChatMessage[]>(`chat:${conversacionId}`);
            return data || [];
        } catch {
            return [];
        }
    }

    // ── Guardar historial en Redis (TTL 1h) ──
    private async saveHistorial(conversacionId: string, historial: ChatMessage[]): Promise<void> {
        try {
            const ultimos = historial.slice(-10);
            await this.redisCache.set(`chat:${conversacionId}`, ultimos, 3600);
        } catch {
            this.logger.warn('Error guardando historial en Redis');
        }
    }

    // ── Responder por intent ──
    private async handlePrediccion(usuarioId: string): Promise<string> {
        try {
            const parcelas = await this.parcelaRepo.find({
                where: { agricultor: { usuario_id: usuarioId } } as any,
                relations: ['agricultor'],
                take: 3,
            });

            if (!parcelas.length) {
                return 'No tienes parcelas registradas. Ve a la sección Parcelas para agregar una.';
            }

            const predicciones = await this.prediccionRepo.find({
                where: { parcela_id: parcelas[0].parcela_id },
                order: { fecha_prediccion: 'DESC' },
                take: 1,
            });

            if (!predicciones.length) {
                return `Tu parcela "${parcelas[0].nombre}" no tiene predicciones aún. Ve a Predicciones para generar una.`;
            }

            const p = predicciones[0];
            return `📊 **Última predicción** para "${parcelas[0].nombre}":\n` +
                `• Rendimiento estimado: **${p.rendimiento_predicho_ton} ton/ha**\n` +
                `• Nivel de riesgo: ${p.nivel_riesgo}\n` +
                `• Confianza: ${p.puntaje_confianza}%\n` +
                `• Intervalo: ${p.intervalo_conf_inferior} - ${p.intervalo_conf_superior} ton/ha\n\n` +
                `Para más detalle ve a la sección Predicciones.`;
        } catch (err) {
            return 'No pude obtener tus predicciones. Intenta desde la sección Predicciones.';
        }
    }

    private async handleAlerta(usuarioId: string): Promise<string> {
        try {
            const alertas = await this.alertaRepo.find({
                where: { usuario_id: usuarioId, esta_leida: false },
                relations: ['tipoAlerta'],
                order: { creado_en: 'DESC' },
                take: 3,
            });

            if (!alertas.length) {
                return '✅ No tienes alertas activas sin leer. Todo está en orden.';
            }

            const lista = alertas.map((a) =>
                `• **${a.titulo}** (${a.severidad})`
            ).join('\n');

            return `⚠️ Tienes **${alertas.length} alerta(s) sin leer**:\n\n${lista}\n\nVe a la sección Alertas para ver el detalle.`;
        } catch {
            return 'No pude consultar tus alertas. Ve a la sección Alertas.';
        }
    }

    private async handleRAG(
        mensaje: string,
        _historial: ChatMessage[],
        _usuarioId: string,
        opciones?: {
            cultivo?: string;
            region?: string;
            nombreUsuario?: string;
            parcela_id?: string;
        },
    ): Promise<{ respuesta: string; fuentes: any[] }> {
        try {
            const response = await axios.post(
                `${this.ragUrl}/query`,
                {
                    pregunta: mensaje,
                    top_k: 5,
                    cultivo: opciones?.cultivo,
                    region: opciones?.region,
                    nombre_agricultor: opciones?.nombreUsuario,
                },
                { timeout: 30000 },
            );

            return {
                respuesta: response.data.respuesta || 'No encontré información relevante.',
                fuentes: response.data.fuentes || [],
            };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error consultando RAG: ${msg}`);
            return {
                respuesta: 'El servicio de consulta de documentos no está disponible en este momento.',
                fuentes: [],
            };
        }
    }

    // ── Método principal ──
    async sendMessage(
        usuarioId: string,
        mensaje: string,
        conversacionId?: string,
        opciones?: {
            cultivo?: string;
            region?: string;
            nombreUsuario?: string;
            parcela_id?: string;
        },
    ): Promise<ChatResponse> {
        const convId = conversacionId || randomUUID();
        const historial = await this.getHistorial(convId);

        // Agregar mensaje del usuario
        historial.push({
            rol: 'usuario',
            contenido: mensaje,
            timestamp: new Date().toISOString(),
        });

        const intent = this.detectIntent(mensaje);
        let respuesta = '';
        let fuentes: any[] = [];

        // ── Respuestas rápidas ──
        if (/^(hola|buenas|buenos|buen dia|hi|hello)/i.test(mensaje.trim())) {
            const nombre = opciones?.nombreUsuario ? `, ${opciones.nombreUsuario}` : '';
            respuesta = `👋 ¡Hola${nombre}! Soy AgroVision, tu asistente agrícola.\n\n` +
                `Puedo ayudarte con:\n` +
                `• 📊 **Predicciones** de rendimiento\n` +
                `• ⚠️ **Alertas** climáticas activas\n` +
                `• 📚 **Consultas técnicas** sobre cultivos\n` +
                `• 💡 **Recomendaciones** personalizadas\n\n` +
                `¿En qué te puedo ayudar hoy?`;
        } else {
            switch (intent) {
                case 'prediccion':
                    respuesta = await this.handlePrediccion(usuarioId);
                    break;
                case 'alerta':
                    respuesta = await this.handleAlerta(usuarioId);
                    break;
                default: {
                    const ragResult = await this.handleRAG(
                        mensaje,
                        historial,
                        usuarioId,
                        opciones,
                    );
                    respuesta = ragResult.respuesta;
                    fuentes = ragResult.fuentes;
                    break;
                }
            }
        }

        // Agregar respuesta al historial
        historial.push({
            rol: 'asistente',
            contenido: respuesta,
            timestamp: new Date().toISOString(),
            fuentes: fuentes.slice(0, 3),
            tipo: intent,
        });

        await this.saveHistorial(convId, historial);
        this.logger.log(`Chat [${intent}] usuario=${usuarioId} conv=${convId}`);

        return {
            conversacion_id: convId,
            respuesta,
            fuentes: fuentes.slice(0, 3),
            tipo: intent,
            timestamp: new Date().toISOString(),
        };
    }

    async getHistorialPublico(conversacionId: string): Promise<ChatMessage[]> {
        return this.getHistorial(conversacionId);
    }

    async clearConversation(conversacionId: string): Promise<{ cleared: boolean }> {
        try {
            await this.redisCache.del(`chat:${conversacionId}`);
            return { cleared: true };
        } catch {
            return { cleared: false };
        }
    }

    async getConversacionesActivas(): Promise<{ total: number }> {
        return { total: 0 };
    }
}