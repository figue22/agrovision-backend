import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';
import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { Severidad } from '@common/enums/enums';

@Injectable()
export class WhatsappAlertsService {
    private readonly logger = new Logger(WhatsappAlertsService.name);

    constructor(
        private readonly metaService: MetaWhatsappService,
        @InjectRepository(SesionWhatsapp)
        private readonly sesionRepo: Repository<SesionWhatsapp>,
    ) {}

    @OnEvent('alerta.critica')
    async handleAlertaCritica(alerta: Alerta): Promise<void> {
        await this.notificarAlerta(alerta);
    }

    async notificarAlerta(alerta: Alerta): Promise<void> {
        if (![Severidad.CRITICA, Severidad.ALTA].includes(alerta.severidad)) return;

        const sesion = await this.sesionRepo.findOne({
            where: { usuario_id: alerta.usuario_id, esta_bloqueado: false },
        });

        if (!sesion?.wa_id) {
            this.logger.debug(`Usuario ${alerta.usuario_id} no tiene WhatsApp registrado`);
            return;
        }

        const emoji = alerta.severidad === Severidad.CRITICA ? '🚨' : '⚠️';
        const mensaje = this.formatAlertaWhatsApp(alerta, emoji);
        const enviado = await this.metaService.sendTextMessage(sesion.wa_id, mensaje);

        if (enviado) {
            this.logger.log(`Alerta ${alerta.severidad} notificada por WhatsApp a ${sesion.wa_id}`);
            await this.sesionRepo.update(sesion.sesion_wa_id, {
                mensajes_enviados: (sesion.mensajes_enviados || 0) + 1,
            });
        }
    }

    async notificarAlertasMasivas(alertas: Alerta[]): Promise<void> {
        const filtradas = alertas.filter((a) =>
            [Severidad.CRITICA, Severidad.ALTA].includes(a.severidad),
        );
        for (const alerta of filtradas) {
            await this.notificarAlerta(alerta);
        }
    }

    private formatAlertaWhatsApp(alerta: Alerta, emoji: string): string {
        let mensaje = `${emoji} *Alerta ${alerta.severidad.toUpperCase()}*\n\n`;
        mensaje += `*${alerta.titulo}*\n\n`;
        mensaje += `${alerta.mensaje}\n\n`;
        if (alerta.accion_requerida) {
            mensaje += `📋 *Acción requerida:*\n${alerta.accion_requerida}\n\n`;
        }
        mensaje += `_Escribe */alertas* para ver todas tus alertas._`;
        return mensaje.slice(0, 4096);
    }
}