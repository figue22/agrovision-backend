import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { WeatherJobData, WeatherJobResult } from './weather-job.processor';

@Injectable()
export class WeatherSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(WeatherSchedulerService.name);

  constructor(
    @InjectQueue('weather')
    private readonly weatherQueue: Queue<WeatherJobData>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Limpiar jobs repetibles anteriores al arrancar
    await this.weatherQueue.removeRepeatable('fetch_all', {
      cron: '0 */6 * * *',
    });

    // Programar job repetible cada 6 horas
    await this.weatherQueue.add(
      'fetch_all',
      { tipo: 'fetch_all' },
      {
        repeat: { cron: '0 */6 * * *' }, // 00:00, 06:00, 12:00, 18:00
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 }, // retry: 1min, 2min, 4min
        removeOnComplete: 50, // conservar últimos 50 jobs completados
        removeOnFail: 20,     // conservar últimos 20 jobs fallidos
        jobId: 'weather-fetch-all-scheduled',
      },
    );

    this.logger.log('Job de recolección de clima programado cada 6 horas (cron: 0 */6 * * *)');
  }

  // ── Disparar manualmente desde admin ──
  async triggerFetchAll(): Promise<Job<WeatherJobData>> {
    this.logger.log('Disparando job manual de recolección de clima');
    return this.weatherQueue.add(
      'fetch_all',
      { tipo: 'fetch_all' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 30,
      },
    );
  }

  async triggerFetchOne(parcelaId: string): Promise<Job<WeatherJobData>> {
    return this.weatherQueue.add(
      'fetch_one',
      { tipo: 'fetch_one', parcela_id: parcelaId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
      },
    );
  }

  // ── Estado del queue (para panel admin) ──
  async getQueueStats(
  completadosPage = 0,
  fallidosPage = 0,
  activosPage = 0,
  pageSize = 5,
) {
  const jobCounts = await this.weatherQueue.getJobCounts();

  const [active, completed, failed] = await Promise.all([
    this.weatherQueue.getActive(activosPage * pageSize, activosPage * pageSize + pageSize - 1),
    this.weatherQueue.getCompleted(completadosPage * pageSize, completadosPage * pageSize + pageSize - 1),
    this.weatherQueue.getFailed(fallidosPage * pageSize, fallidosPage * pageSize + pageSize - 1),
  ]);

  return {
    counts: jobCounts,
    active: active.map((j) => ({
      id: j.id,
      nombre: j.name,
      progreso: j.progress(),
      iniciado_en: new Date(j.processedOn || Date.now()),
    })),
    completados: completed.map((j) => ({
      id: j.id,
      nombre: j.name,
      resultado: j.returnvalue as WeatherJobResult,
      completado_en: new Date(j.finishedOn || Date.now()),
    })),
    fallidos: failed.map((j) => ({
      id: j.id,
      nombre: j.name,
      error: j.failedReason || 'Error desconocido',
      intentos: j.attemptsMade,
      fallido_en: new Date(j.finishedOn || Date.now()),
    })),
    proxima_ejecucion: this.getProximaEjecucion(),
  };
}

async retryFailedJobs(): Promise<{ retried: number }> {
  const failed = await this.weatherQueue.getFailed();
  let retried = 0;
  for (const job of failed) {
    try {
      await job.retry();
      retried++;
    } catch (err) {
      this.logger.warn(`No se pudo reintentar job ${job.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { retried };
}

  private getProximaEjecucion(): string {
    const ahora = new Date();
    const hora = ahora.getHours();
    const proximaHora = Math.ceil((hora + 1) / 6) * 6;
    const proxima = new Date(ahora);
    proxima.setHours(proximaHora % 24, 0, 0, 0);
    if (proximaHora >= 24) proxima.setDate(proxima.getDate() + 1);
    return proxima.toISOString();
  }
}