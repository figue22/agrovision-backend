/**
 * HU-053 — Servicio de procesamiento de webhooks WhatsApp
 * Con asociación de cuenta por correo
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';
import { WhatsappService } from '@modules/whatsapp/application/use-cases/whatsapp.service';
import { ChatbotService } from '@modules/chatbot/application/use-cases/chatbot.service';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { EstadoRegistroWhatsapp } from '@common/enums/enums';

export interface WhatsAppWebhookEntry {
    id: string;
    changes: {
        value: {
            messaging_product: string;
            metadata: { phone_number_id: string; display_phone_number: string };
            contacts?: { profile: { name: string }; wa_id: string }[];
            messages?: {
                from: string;
                id: string;
                timestamp: string;
                type: string;
                text?: { body: string };
            }[];
            statuses?: { id: string; status: string; timestamp: string; recipient_id: string }[];
        };
        field: string;
    }[];
}

@Injectable()
export class WhatsappWebhookService {
    private readonly logger = new Logger(WhatsappWebhookService.name);

    constructor(
        private readonly metaService: MetaWhatsappService,
        private readonly whatsappService: WhatsappService,
        private readonly chatbotService: ChatbotService,
        @InjectRepository(Usuario)
        private readonly usuarioRepo: Repository<Usuario>,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
    ) {}

    async processWebhook(body: { object: string; entry: WhatsAppWebhookEntry[] }): Promise<void> {
        if (body.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field !== 'messages') continue;
                const value = change.value;

                for (const message of value.messages || []) {
                    await this.handleIncomingMessage(message, value.contacts || []);
                }
            }
        }
    }

    private async handleIncomingMessage(
        message: {
            from: string;
            id: string;
            timestamp: string;
            type: string;
            text?: { body: string };
        },
        contacts: { profile: { name: string }; wa_id: string }[],
    ): Promise<void> {
        const from = message.from;
        const nombreMostrado = contacts.find((c) => c.wa_id === from)?.profile.name;

        this.logger.log(`Mensaje WA de ${from} (${nombreMostrado}): ${message.type}`);

        // Solo mensajes de texto
        if (message.type !== 'text' || !message.text?.body) {
            await this.metaService.sendTextMessage(
                from,
                'Por ahora solo proceso mensajes de texto. Escríbeme tu consulta agrícola 🌱',
            );
            return;
        }

        await this.metaService.markAsRead(message.id);

        // Obtener o crear sesión
        const sesion = await this.whatsappService.findOrCreate(from, nombreMostrado);

        if (sesion.esta_bloqueado) {
            this.logger.warn(`Usuario bloqueado: ${from}`);
            return;
        }

        const texto = message.text.body.trim();

        // ── Comando para vincular cuenta en cualquier momento ──
        if (texto.toLowerCase() === 'vincular' || texto.toLowerCase() === '*vincular*') {
            await this.whatsappService.updateByWaId(from, {
                usuario_id: null,
                contexto_sesion: { esperando_correo: true },
                estado_registro: EstadoRegistroWhatsapp.DESCONOCIDO,
            } as any);
            await this.metaService.sendTextMessage(
                from,
                '🔗 *Vincular cuenta AgroVision*\n\n' +
                'Escríbeme el correo electrónico con el que te registraste en AgroVision:',
            );
            return;
        }

        // ── Flujo de asociación de cuenta ──
        if (!sesion.usuario_id) {
            await this.handleNoAssociated(from, texto, sesion, nombreMostrado);
            return;
        }

        // ── Usuario asociado — respuesta personalizada ──
        await this.handleAssociated(from, texto, sesion);
    }

    private async handleNoAssociated(
        from: string,
        texto: string,
        sesion: any,
        nombreMostrado?: string,
    ): Promise<void> {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const contexto = (sesion.contexto_sesion as any) || {};

        this.logger.log(`esperando_correo=${contexto.esperando_correo} | emailTest=${emailRegex.test(texto)} | texto=${texto}`);

        if (contexto.esperando_correo && emailRegex.test(texto)) {
            const usuario = await this.usuarioRepo.findOne({
                where: { correo: texto.toLowerCase() },
            });

            if (!usuario) {
                await this.metaService.sendTextMessage(
                    from,
                    '❌ No encontré ninguna cuenta con ese correo.\n\n' +
                    'Verifica que sea el mismo correo con el que te registraste en AgroVision, ' +
                    'o escribe *omitir* para continuar sin asociar tu cuenta.',
                );
                return;
            }

            if (usuario.rol !== 'agricultor') {
                await this.metaService.sendTextMessage(
                    from,
                    '❌ Esta función es solo para agricultores registrados en AgroVision.',
                );
                return;
            }

            // Asociar cuenta
            await this.whatsappService.updateByWaId(from, {
                usuario_id: usuario.usuario_id,
                numero_telefono: from,
                estado_registro: EstadoRegistroWhatsapp.REGISTRADO,
                contexto_sesion: { esperando_correo: false },
            } as any);

            // Obtener parcelas
            const parcelas = await this.parcelaRepo.find({
                where: { agricultor: { usuario_id: usuario.usuario_id } } as any,
                take: 3,
            });

            const listaParcelas = parcelas.length > 0
                ? parcelas.map((p) => `• ${p.nombre} (${p.area_hectareas} ha)`).join('\n')
                : '• Aún no tienes parcelas registradas';

            await this.metaService.sendTextMessage(
                from,
                `✅ *¡Cuenta vinculada exitosamente!*\n\n` +
                `Hola *${usuario.nombre}*, ya puedo ver tu información:\n\n` +
                `*Tus parcelas:*\n${listaParcelas}\n\n` +
                `Ahora mis respuestas serán personalizadas para tu finca. ` +
                `¿En qué te puedo ayudar? 🌱`,
            );
            return;
        }

        if (texto.toLowerCase() === 'omitir') {
            await this.whatsappService.updateByWaId(from, {
                contexto_sesion: { esperando_correo: false, omitio_asociacion: true },
            } as any);
            await this.metaService.sendTextMessage(
                from,
                '✅ Entendido. Puedes consultar información general sin asociar tu cuenta.\n\n¿En qué te puedo ayudar? 🌱',
            );
            return;
        }

        // Primer mensaje — solicitar correo
        if (!contexto.esperando_correo && !contexto.omitio_asociacion) {
            await this.whatsappService.updateByWaId(from, {
                numero_telefono: from,
                contexto_sesion: { esperando_correo: true },
            } as any);

            const nombre = nombreMostrado ? `, *${nombreMostrado}*` : '';
            await this.metaService.sendTextMessage(
                from,
                `👋 ¡Hola${nombre}! Soy *AgroVision*, tu asistente agrícola inteligente.\n\n` +
                `Para darte respuestas personalizadas sobre tus parcelas y cultivos, ` +
                `¿me puedes escribir el correo con el que te registraste en AgroVision?\n\n` +
                `O escribe *omitir* para continuar sin personalización.\n\n` +
                `💡 En cualquier momento puedes escribir *vincular* para asociar tu cuenta.`,
            );
            return;
        }

        // Omitió asociación — responder sin personalización
        const convId = `wa_${from}`;
        const respuesta = await this.chatbotService.sendMessage(from, texto, convId);
        const textoFormateado = this.formatForWhatsApp(respuesta.respuesta);
        await this.metaService.sendTextMessage(from, textoFormateado);
    }

    private async handleAssociated(
        from: string,
        texto: string,
        sesion: any,
    ): Promise<void> {
        this.logger.log(`handleAssociated | usuario_id=${sesion.usuario_id} | texto=${texto}`);
        // Obtener contexto del usuario
        const usuario = await this.usuarioRepo.findOne({
            where: { usuario_id: sesion.usuario_id },
        });

        const parcelas = await this.parcelaRepo.find({
            where: { agricultor: { usuario_id: sesion.usuario_id } } as any,
            take: 1,
        });

        const primerCultivo = undefined;
        const departamento = (parcelas[0] as any)?.departamento;

        const convId = `wa_${from}`;

        try {
            const respuesta = await this.chatbotService.sendMessage(
                sesion.usuario_id,
                texto,
                convId,
                {
                    cultivo: primerCultivo,
                    region: departamento,
                    nombreUsuario: usuario ? `${usuario.nombre} ${usuario.apellido}` : undefined,
                },
            );

            const textoFormateado = this.formatForWhatsApp(respuesta.respuesta);
            await this.metaService.sendTextMessage(from, textoFormateado);

            // Actualizar métricas
            await this.whatsappService.updateByWaId(from, {
                ultimo_intent: respuesta.tipo,
                numero_telefono: from,
                mensajes_recibidos: (sesion.mensajes_recibidos || 0) + 1,
                mensajes_enviados: (sesion.mensajes_enviados || 0) + 1,
                total_consultas_rag: respuesta.tipo === 'rag'
                    ? (sesion.total_consultas_rag || 0) + 1
                    : sesion.total_consultas_rag || 0,
                total_predicciones: respuesta.tipo === 'prediccion'
                    ? (sesion.total_predicciones || 0) + 1
                    : sesion.total_predicciones || 0,
            } as any);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error procesando mensaje: ${msg}`);
            await this.metaService.sendTextMessage(
                from,
                'Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.',
            );
        }
    }

    private formatForWhatsApp(texto: string): string {
        return texto
            .replace(/\*\*(.*?)\*\*/g, '*$1*')
            .replace(/#{1,6}\s/g, '')
            .replace(/\[Fuente \d+\][^\n]*/g, '')
            .replace(/\*\*Referencias:\*\*/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            .slice(0, 4096);
    }
}