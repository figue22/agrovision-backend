import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';

@Injectable()
export class AlertNotificationService {
  private readonly logger = new Logger(AlertNotificationService.name);

  constructor(
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {}

  async sendAlertNotification(alerta: Alerta): Promise<void> {
    try {
      await this.notificationQueue.add('send_notification', {
        tipo: 'alerta_climatica',
        usuario_id: alerta.usuario_id,
        titulo: alerta.titulo,
        mensaje: alerta.mensaje,
        severidad: alerta.severidad,
        alerta_id: alerta.alerta_id,
        parcela_id: alerta.parcela_id,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      });

      this.logger.log(`Notificación push encolada para usuario ${alerta.usuario_id}: ${alerta.titulo}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error enviando notificación: ${msg}`);
    }
  }
}