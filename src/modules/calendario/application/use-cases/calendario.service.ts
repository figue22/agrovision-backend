import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Recordatorio, EstadoRecordatorio } from '@modules/calendario/domain/entities/recordatorio.entity';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';
import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class CalendarioService {
    private readonly logger = new Logger(CalendarioService.name);

    constructor(
        @InjectRepository(Recordatorio)
        private readonly recordatorioRepo: Repository<Recordatorio>,
        @InjectRepository(SesionWhatsapp)
        private readonly sesionRepo: Repository<SesionWhatsapp>,
        private readonly metaService: MetaWhatsappService,
    ) {}

    async crearRecordatorio(data: {
        actividad_id?: string;
        usuario_id: string;
        parcela_id?: string;
        titulo: string;
        descripcion?: string;
        fecha_actividad: Date;
        canal?: string;
    }): Promise<Recordatorio[]> {
        const recordatorios: Recordatorio[] = [];

        // Crear recordatorio 24h antes
        const fecha24h = new Date(data.fecha_actividad);
        fecha24h.setHours(fecha24h.getHours() - 24);

        if (fecha24h > new Date()) {
            const r24 = this.recordatorioRepo.create({
                ...data,
                tipo_recordatorio: '24h',
                fecha_envio: fecha24h,
                estado: EstadoRecordatorio.PENDIENTE,
                canal: data.canal || 'whatsapp',
            });
            recordatorios.push(await this.recordatorioRepo.save(r24));
        }

        // Crear recordatorio 1h antes
        const fecha1h = new Date(data.fecha_actividad);
        fecha1h.setHours(fecha1h.getHours() - 1);

        if (fecha1h > new Date()) {
            const r1h = this.recordatorioRepo.create({
                ...data,
                tipo_recordatorio: '1h',
                fecha_envio: fecha1h,
                estado: EstadoRecordatorio.PENDIENTE,
                canal: data.canal || 'whatsapp',
            });
            recordatorios.push(await this.recordatorioRepo.save(r1h));
        }

        this.logger.log(
            `Recordatorios creados para actividad ${data.actividad_id}: ${recordatorios.length}`,
        );
        return recordatorios;
    }

    async cancelarRecordatorios(actividadId: string): Promise<void> {
        await this.recordatorioRepo.update(
            { actividad_id: actividadId, estado: EstadoRecordatorio.PENDIENTE },
            { estado: EstadoRecordatorio.CANCELADO },
        );
    }

    async getRecordatoriosByUsuario(usuarioId: string): Promise<Recordatorio[]> {
        return this.recordatorioRepo.find({
            where: { usuario_id: usuarioId },
            order: { fecha_actividad: 'ASC' },
            take: 20,
        });
    }

    // ── Scheduler: cada 5 minutos revisa recordatorios pendientes ──
    @Cron(CronExpression.EVERY_5_MINUTES)
    async procesarRecordatoriosPendientes(): Promise<void> {
        const ahora = new Date();
        const en5min = new Date(ahora.getTime() + 5 * 60 * 1000);

        const pendientes = await this.recordatorioRepo.find({
            where: {
                estado: EstadoRecordatorio.PENDIENTE,
                fecha_envio: LessThanOrEqual(en5min),
            },
            take: 50,
        });

        if (!pendientes.length) return;

        this.logger.log(`Procesando ${pendientes.length} recordatorios pendientes`);

        for (const recordatorio of pendientes) {
            await this.enviarRecordatorio(recordatorio);
        }
    }

    private async enviarRecordatorio(recordatorio: Recordatorio): Promise<void> {
        try {
            const sesion = await this.sesionRepo.findOne({
                where: {
                    usuario_id: recordatorio.usuario_id,
                    esta_bloqueado: false,
                },
            });

            if (!sesion?.wa_id) {
                await this.recordatorioRepo.update(recordatorio.recordatorio_id, {
                    estado: EstadoRecordatorio.CANCELADO,
                });
                return;
            }

            const emoji = recordatorio.tipo_recordatorio === '1h' ? '⏰' : '📅';
            const tiempo = recordatorio.tipo_recordatorio === '1h'
                ? 'en *1 hora*'
                : 'mañana (en *24 horas*)';

            const mensaje =
                `${emoji} *Recordatorio AgroVision*\n\n` +
                `Tienes una actividad programada ${tiempo}:\n\n` +
                `*${recordatorio.titulo}*\n` +
                (recordatorio.descripcion ? `${recordatorio.descripcion}\n\n` : '\n') +
                `📆 Fecha: ${recordatorio.fecha_actividad.toLocaleDateString('es-CO', {
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })}\n\n` +
                `_Escribe */menu* para ver más opciones._`;

            const enviado = await this.metaService.sendTextMessage(sesion.wa_id, mensaje);

            await this.recordatorioRepo.update(recordatorio.recordatorio_id, {
                estado: enviado ? EstadoRecordatorio.ENVIADO : EstadoRecordatorio.FALLIDO,
                enviado_en: enviado ? new Date() : undefined,
            });

            this.logger.log(
                `Recordatorio ${recordatorio.tipo_recordatorio} enviado a ${sesion.wa_id}`,
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error enviando recordatorio: ${msg}`);
            await this.recordatorioRepo.update(recordatorio.recordatorio_id, {
                estado: EstadoRecordatorio.FALLIDO,
            });
        }
    }

    @OnEvent('actividad.creada')
    async handleActividadCreada(data: {
        actividad_id: string;
        usuario_id: string;
        parcela_id?: string;
        titulo: string;
        descripcion?: string;
        fecha_actividad: Date;
    }): Promise<void> {
        await this.crearRecordatorio(data);
    }
}