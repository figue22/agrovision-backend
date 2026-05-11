import {
  Process,
  Processor,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

export interface NotificationJobData {
  tipo: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  canal: 'push' | 'email' | 'whatsapp';
  metadata?: Record<string, unknown>;
}

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send')
  async handleSendNotification(job: Job<NotificationJobData>): Promise<void> {
    const { tipo, usuario_id, titulo, canal } = job.data;

    this.logger.log(
      `Procesando notificación [${tipo}] para usuario ${usuario_id} vía ${canal}`,
    );

    // TODO: Implementar lógica real según canal
    // push: Firebase Cloud Messaging
    // email: Nodemailer / SendGrid
    // whatsapp: WhatsApp Business API

    this.logger.log(`Notificación enviada: "${titulo}" → ${canal}`);
  }

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`Job ${job.id} iniciado: ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.debug(`Job ${job.id} completado: ${job.name}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job ${job.id} falló: ${job.name} — ${error.message}`,
    );
  }
}