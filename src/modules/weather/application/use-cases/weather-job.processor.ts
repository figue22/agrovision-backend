import {
  Process,
  Processor,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OpenWeatherMapService } from './openweathermap.service';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';

import { ClimateAlertService } from '@modules/alerts/application/use-cases/climate-alert.service';

export interface WeatherJobData {
  tipo: 'fetch_all' | 'fetch_one';
  parcela_id?: string;
}

export interface WeatherJobResult {
  actualizadas: number;
  errores: number;
  duracion_ms: number;
  parcelas_con_error: string[];
}

@Processor('weather')
export class WeatherJobProcessor {
  private readonly logger = new Logger(WeatherJobProcessor.name);

  constructor(
  private readonly owmService: OpenWeatherMapService,
  private readonly climateAlertService: ClimateAlertService,
  @InjectRepository(Parcela)
  private readonly parcelaRepo: Repository<Parcela>,
) {}

  @Process('fetch_all')
  async handleFetchAll(job: Job<WeatherJobData>): Promise<WeatherJobResult> {
    const inicio = Date.now();
    this.logger.log(`Job ${job.id}: iniciando recolección de clima para todas las parcelas`);

    const parcelas = await this.parcelaRepo.find();
    this.logger.log(`Job ${job.id}: procesando ${parcelas.length} parcelas`);

    let actualizadas = 0;
    let errores = 0;
    const parcelas_con_error: string[] = [];

    for (let i = 0; i < parcelas.length; i++) {
      const parcela = parcelas[i];
      try {
        await this.owmService.fetchCurrentWeather(parcela.parcela_id);
        actualizadas++;

        // Actualizar progreso del job (visible en el panel admin)
        await job.progress(Math.round(((i + 1) / parcelas.length) * 100));

        this.logger.debug(
          `Job ${job.id}: parcela ${parcela.nombre} (${parcela.parcela_id}) ✅`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Job ${job.id}: error en parcela ${parcela.nombre} (${parcela.parcela_id}): ${msg}`,
        );
        errores++;
        parcelas_con_error.push(parcela.parcela_id);
      }

      // Pequeña pausa entre requests para no exceder rate limit de OpenWeatherMap
      if (i < parcelas.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    const duracion_ms = Date.now() - inicio;
    const resultado: WeatherJobResult = {
      actualizadas,
      errores,
      duracion_ms,
      parcelas_con_error,
    };

    this.logger.log(
      `Job ${job.id}: completado — ${actualizadas} actualizadas, ${errores} errores, ${duracion_ms}ms`,
    );

    // Evaluar alertas climáticas después de recolectar datos
    try {
      const alertasResult = await this.climateAlertService.evaluarTodasLasParcelas();
      this.logger.log(
        `Job ${job.id}: alertas evaluadas — ${alertasResult.alertas_generadas} alertas generadas`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.id}: error evaluando alertas — ${msg}`);
    }

     try {
      const recordatorios = await this.climateAlertService.evaluarRecordatorios();
      this.logger.log(
        `Job ${job.id}: ${recordatorios} recordatorios de cosecha generados`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.id}: error evaluando recordatorios — ${msg}`);
    }

    return resultado;
  }

  @Process('fetch_one')
  async handleFetchOne(job: Job<WeatherJobData>): Promise<WeatherJobResult> {
    const inicio = Date.now();

    if (!job.data.parcela_id) {
      throw new Error('parcela_id es requerido para fetch_one');
    }

    this.logger.log(`Job ${job.id}: fetch clima para parcela ${job.data.parcela_id}`);

    try {
      await this.owmService.fetchCurrentWeather(job.data.parcela_id);
      return { actualizadas: 1, errores: 0, duracion_ms: Date.now() - inicio, parcelas_con_error: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Error fetch_one parcela ${job.data.parcela_id}: ${msg}`);
    }
  }

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.log(`[weather] Job ${job.id} (${job.name}) iniciado`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: WeatherJobResult): void {
    this.logger.log(
      `[weather] Job ${job.id} (${job.name}) completado — ${result.actualizadas} actualizadas, ${result.errores} errores`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `[weather] Job ${job.id} (${job.name}) FALLÓ — ${error.message}`,
    );
  }
}