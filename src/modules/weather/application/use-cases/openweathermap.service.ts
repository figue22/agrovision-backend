import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { RedisCacheService } from '@common/redis/redis-cache.service';

interface OWMCurrentResponse {
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  wind: { speed: number };
  clouds: { all: number };
  rain?: { '1h'?: number; '3h'?: number };
  weather: { description: string }[];
  dt: number;
}


interface OWMForecastItem {
  dt: number;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  wind: { speed: number };
  clouds: { all: number };
  pop: number;
  rain?: { '3h': number };
  weather: { description: string }[];
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
}

@Injectable()
export class OpenWeatherMapService {
  private readonly logger = new Logger(OpenWeatherMapService.name);
  private readonly API_BASE = 'https://api.openweathermap.org/data/2.5';
  private readonly CACHE_TTL = 21600; // 6 horas
  private readonly MAX_RETRIES = 3;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(DatoClimatico)
    private readonly datoClimaticoRepo: Repository<DatoClimatico>,
    @InjectRepository(Parcela)
    private readonly parcelaRepo: Repository<Parcela>,
    private readonly cache: RedisCacheService,
  ) {
    this.apiKey = this.configService.get<string>('OPENWEATHERMAP_API_KEY', '');
  }

  // ── Clima actual de una parcela ──
  async fetchCurrentWeather(parcelaId: string): Promise<DatoClimatico> {
    const cacheKey = `weather:current:${parcelaId}`;

    const cached = await this.cache.get<DatoClimatico>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: clima actual parcela ${parcelaId}`);
      return cached;
    }

    const parcela = await this.getParcelaWithCoords(parcelaId);
    const coords = this.extractCoords(parcela);

    const data = await this.callWithRetry<OWMCurrentResponse>(
      `${this.API_BASE}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric&lang=es`,
    );

    // Obtener índice UV
    // Índice UV via Air Quality API (gratuita)
    let indiceUv: number | undefined;
    try {
      const aqData = await this.callWithRetry<{
        list: { main: { aqi: number } }[];
      }>(
        `${this.API_BASE}/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}`,
      );
      // AQI 1-5, lo normalizamos a escala UV 0-11
      const aqi = aqData.list?.[0]?.main?.aqi ?? 1;
      indiceUv = Math.round((aqi - 1) * 2.75);
    } catch {
      this.logger.warn(`No se pudo obtener índice UV para parcela ${parcelaId}`);
      indiceUv = undefined;
    }

    const precipitacion = data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0;
    const hoy = new Date().toISOString().split('T')[0];

    const datoData = {
      parcela_id: parcelaId,
      fecha: new Date(hoy),
      temp_maxima: Math.round(data.main.temp_max * 100) / 100,
      temp_minima: Math.round(data.main.temp_min * 100) / 100,
      temp_promedio: Math.round(data.main.temp * 100) / 100,
      humedad_pct: data.main.humidity,
      velocidad_viento: Math.round(data.wind.speed * 100) / 100,
      cobertura_nubes_pct: data.clouds.all,
      precipitacion_mm: precipitacion,
      indice_uv: indiceUv,
      fuente: 'openweathermap',
      datos_crudos: data as unknown as object,
    };

    const existente = await this.datoClimaticoRepo.findOne({
      where: { parcela_id: parcelaId, fecha: new Date(hoy), fuente: 'openweathermap' },
    });

    let resultado: DatoClimatico;
    if (existente) {
      Object.assign(existente, datoData);
      resultado = await this.datoClimaticoRepo.save(existente);
    } else {
      resultado = await this.datoClimaticoRepo.save(
        this.datoClimaticoRepo.create(datoData),
      );
    }

    await this.cache.set(cacheKey, resultado, this.CACHE_TTL);
    this.logger.log(`Clima actual obtenido para parcela ${parcelaId}`);

    return resultado;
  }

  // ── Pronóstico 5 días de una parcela ──
  async fetchForecast(parcelaId: string): Promise<DatoClimatico[]> {
    const cacheKey = `weather:forecast:${parcelaId}`;

    const cached = await this.cache.get<DatoClimatico[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: pronóstico parcela ${parcelaId}`);
      return cached;
    }

    const parcela = await this.getParcelaWithCoords(parcelaId);
    const coords = this.extractCoords(parcela);

    const data = await this.callWithRetry<OWMForecastResponse>(
      `${this.API_BASE}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric&lang=es`,
    );

    // Agrupar por día
    const porDia = new Map<string, OWMForecastItem[]>();
    for (const item of data.list) {
      const fecha = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!porDia.has(fecha)) porDia.set(fecha, []);
      porDia.get(fecha)!.push(item);
    }

    const resultados: DatoClimatico[] = [];

    for (const [fecha, items] of porDia) {
      const tempMax = Math.max(...items.map((i) => i.main.temp_max));
      const tempMin = Math.min(...items.map((i) => i.main.temp_min));
      const tempProm = items.reduce((s, i) => s + i.main.temp, 0) / items.length;
      const humProm = items.reduce((s, i) => s + i.main.humidity, 0) / items.length;
      const vientoProm = items.reduce((s, i) => s + i.wind.speed, 0) / items.length;
      const nubesProm = items.reduce((s, i) => s + i.clouds.all, 0) / items.length;
      const lluviaTotal = items.reduce((s, i) => s + (i.rain?.['3h'] ?? 0), 0);

      const datoData = {
        parcela_id: parcelaId,
        fecha: new Date(fecha),
        temp_maxima: Math.round(tempMax * 100) / 100,
        temp_minima: Math.round(tempMin * 100) / 100,
        temp_promedio: Math.round(tempProm * 100) / 100,
        humedad_pct: Math.round(humProm * 100) / 100,
        precipitacion_mm: Math.round(lluviaTotal * 100) / 100,
        velocidad_viento: Math.round(vientoProm * 100) / 100,
        cobertura_nubes_pct: Math.round(nubesProm * 100) / 100,
        indice_uv: undefined,
        fuente: 'openweathermap_forecast',
        datos_crudos: { items_count: items.length, fecha } as object,
      };

      const existente = await this.datoClimaticoRepo.findOne({
        where: { parcela_id: parcelaId, fecha: new Date(fecha), fuente: 'openweathermap_forecast' },
      });

      let resultado: DatoClimatico;
      if (existente) {
        Object.assign(existente, datoData);
        resultado = await this.datoClimaticoRepo.save(existente);
      } else {
        resultado = await this.datoClimaticoRepo.save(
          this.datoClimaticoRepo.create(datoData),
        );
      }

      resultados.push(resultado);
    }

    await this.cache.set(cacheKey, resultados, this.CACHE_TTL);
    this.logger.log(
      `Pronóstico 5 días obtenido para parcela ${parcelaId} (${resultados.length} días)`,
    );

    return resultados;
  }

  // ── Actualizar clima de TODAS las parcelas ──
  async fetchAllParcelas(): Promise<{ actualizadas: number; errores: number }> {
    const parcelas = await this.parcelaRepo.find();
    let actualizadas = 0;
    let errores = 0;

    for (const parcela of parcelas) {
      try {
        await this.fetchCurrentWeather(parcela.parcela_id);
        actualizadas++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error clima parcela ${parcela.parcela_id}: ${msg}`);
        errores++;
      }
    }

    return { actualizadas, errores };
  }

  // ── Helper: obtener parcela ──
  private async getParcelaWithCoords(parcelaId: string): Promise<Parcela> {
    const parcela = await this.parcelaRepo.findOne({
      where: { parcela_id: parcelaId },
    });
    if (!parcela) throw new Error(`Parcela ${parcelaId} no encontrada`);
    return parcela;
  }

  // ── Helper: extraer lat/lon del campo PostGIS geography ──
  private extractCoords(parcela: Parcela): { lat: number; lon: number } {
    const ubicacion = parcela.ubicacion as any;

    if (ubicacion?.coordinates) {
      return {
        lon: ubicacion.coordinates[0],
        lat: ubicacion.coordinates[1],
      };
    }

    if (ubicacion?.lat !== undefined && ubicacion?.lon !== undefined) {
      return { lat: ubicacion.lat, lon: ubicacion.lon };
    }

    if (ubicacion?.latitude !== undefined && ubicacion?.longitude !== undefined) {
      return { lat: ubicacion.latitude, lon: ubicacion.longitude };
    }

    throw new Error(
      `Parcela ${parcela.parcela_id} no tiene coordenadas válidas`,
    );
  }

  // ── Helper: HTTP con retry exponencial ──
  private async callWithRetry<T>(url: string, attempt = 1): Promise<T> {
    try {
      const response = await axios.get<T>(url, { timeout: 10000 });
      return response.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (attempt >= this.MAX_RETRIES) {
        this.logger.error(
          `OpenWeatherMap falló después de ${this.MAX_RETRIES} intentos: ${msg}`,
        );
        throw new Error(`Error al consultar OpenWeatherMap: ${msg}`);
      }

      const delay = Math.pow(2, attempt) * 1000;
      this.logger.warn(`Retry ${attempt}/${this.MAX_RETRIES} en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.callWithRetry<T>(url, attempt + 1);
    }
  }
}