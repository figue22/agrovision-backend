import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationJobData } from './notification.processor';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue<NotificationJobData>,
  ) {}

  async sendNotification(data: NotificationJobData): Promise<void> {
    await this.notificationQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(
      `Notificación encolada: [${data.tipo}] → ${data.canal} para ${data.usuario_id}`,
    );
  }

  async sendDelayed(
    data: NotificationJobData,
    delayMs: number,
  ): Promise<void> {
    await this.notificationQueue.add('send', data, {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    this.logger.log(
      `Notificación programada en ${delayMs}ms: [${data.tipo}] → ${data.canal}`,
    );
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}