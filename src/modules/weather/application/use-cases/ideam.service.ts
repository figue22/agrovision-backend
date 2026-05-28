import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { RedisCacheService } from '@common/redis/redis-cache.service';

interface IdeamEstacion {
  codigo: string;
  nombre: string;
  latitud: string;
  longitud: string;
  departamento: string;
  municipio: string;
  estado: string;
}

interface IdeamTemperaturaRecord {
  codigoestacion: string;
  fechaobservacion: string;
  valorobservado: string;
  nombreestacion?: string;
}

interface IdeamPrecipitacionRecord {
  codigoestacion: string;
  fechaobservacion: string;
  valorobservado: string;
}


@Injectable()
export class IdeamService {
  private readonly logger = new Logger(IdeamService.name);
  private readonly SOCRATA_BASE = 'https://www.datos.gov.co/resource';
  private readonly DATASET_TEMPERATURA = 'sbwg-7ju4';
  private readonly DATASET_PRECIPITACION = 's54a-sgyg';
  private readonly DATASET_ESTACIONES = 'hp9r-jxuu';
  private readonly CACHE_TTL = 86400; // 24 horas (datos históricos no cambian)
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectRepository(DatoClimatico)
    private readonly datoClimaticoRepo: Repository<DatoClimatico>,
    @InjectRepository(Parcela)
    private readonly parcelaRepo: Repository<Parcela>,
    private readonly cache: RedisCacheService,
  ) {}

  // ── Obtener datos históricos IDEAM para una parcela ──
  async fetchHistorico(
    parcelaId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<{ guardados: number; estacion: string; distancia_km: number }> {
    const cacheKey = `ideam:historico:${parcelaId}:${fechaInicio}:${fechaFin}`;
    const cached = await this.cache.get<{ guardados: number; estacion: string; distancia_km: number }>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: IDEAM histórico parcela ${parcelaId}`);
      return cached;
    }

    const parcela = await this.parcelaRepo.findOne({ where: { parcela_id: parcelaId } });
    if (!parcela) throw new Error(`Parcela ${parcelaId} no encontrada`);

    this.logger.log(`Parcela encontrada: ${parcela.parcela_id}`);
    this.logger.log(`Coords: ${JSON.stringify(this.extractCoords(parcela))}`);

    const coords = this.extractCoords(parcela);
    const estacion = await this.findEstacionMasCercana(coords.lat, coords.lon);

    this.logger.log(
      `Estación IDEAM más cercana: ${estacion.nombre} (${estacion.codigo}) a ${estacion.distancia_km} km`,
    );

    this.logger.log(`Estacion seleccionada: ${JSON.stringify(estacion)}`);

    const [temperaturas, precipitaciones] = await Promise.all([
      this.fetchTemperaturas(estacion.codigo, fechaInicio, fechaFin),
      this.fetchPrecipitaciones(estacion.codigo, fechaInicio, fechaFin),
    ]);
    this.logger.log(`Registros temperatura raw: ${JSON.stringify(temperaturas.slice(0, 2))}`);
    this.logger.log(`Registros precipitacion raw: ${JSON.stringify(precipitaciones.slice(0, 2))}`);

    // Agrupar por fecha
    // Agrupar por fecha calculando promedio
const porFecha = new Map<string, { temps: number[]; precs: number[] }>();

for (const t of temperaturas) {
  const fecha = t.fechaobservacion.split('T')[0];
  if (!porFecha.has(fecha)) porFecha.set(fecha, { temps: [], precs: [] });
  const val = parseFloat(t.valorobservado);
  if (!isNaN(val)) porFecha.get(fecha)!.temps.push(val);
}

for (const p of precipitaciones) {
  const fecha = p.fechaobservacion.split('T')[0];
  if (!porFecha.has(fecha)) porFecha.set(fecha, { temps: [], precs: [] });
  const val = parseFloat(p.valorobservado);
  if (!isNaN(val)) porFecha.get(fecha)!.precs.push(val);
}

let guardados = 0;
for (const [fecha, datos] of porFecha) {
  const tempProm = datos.temps.length > 0
    ? Math.round((datos.temps.reduce((s, v) => s + v, 0) / datos.temps.length) * 100) / 100
    : undefined;
  const precTotal = datos.precs.length > 0
    ? Math.round(datos.precs.reduce((s, v) => s + v, 0) * 100) / 100
    : 0;

  const existente = await this.datoClimaticoRepo.findOne({
    where: { parcela_id: parcelaId, fecha: new Date(fecha), fuente: 'ideam' },
  });

  const datoData = {
    parcela_id: parcelaId,
    fecha: new Date(fecha),
    temp_promedio: tempProm,
    precipitacion_mm: precTotal,
    fuente: 'ideam',
    datos_crudos: {
      estacion_codigo: estacion.codigo,
      estacion_nombre: estacion.nombre,
      distancia_km: estacion.distancia_km,
      registros_temp: datos.temps.length,
      registros_prec: datos.precs.length,
    } as object,
  };

  if (existente) {
    Object.assign(existente, datoData);
    await this.datoClimaticoRepo.save(existente);
  } else {
    await this.datoClimaticoRepo.save(
      this.datoClimaticoRepo.create(datoData),
    );
  }
  guardados++;
}

    const resultado = {
      guardados,
      estacion: `${estacion.nombre} (${estacion.codigo})`,
      distancia_km: estacion.distancia_km,
    };

    await this.cache.set(cacheKey, resultado, this.CACHE_TTL);
    this.logger.log(`IDEAM: ${guardados} registros guardados para parcela ${parcelaId}`);

    return resultado;
  }

  // ── Buscar estación más cercana a las coordenadas ──
  private async findEstacionMasCercana(
  lat: number,
  lon: number,
): Promise<{ codigo: string; nombre: string; distancia_km: number }> {
  const cacheKey = `ideam:estacion:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await this.cache.get<{ codigo: string; nombre: string; distancia_km: number }>(cacheKey);
  if (cached) return cached;

  const query = encodeURIComponent(
    `latitud > ${lat - 5} AND latitud < ${lat + 5} AND longitud > ${lon - 5} AND longitud < ${lon + 5} AND (categoria = 'Climatológica Principal' OR categoria = 'Climatológica Ordinaria')`
  );
  const estaciones = await this.callWithRetry<IdeamEstacion[]>(
    `${this.SOCRATA_BASE}/${this.DATASET_ESTACIONES}.json?$where=${query}&$limit=50`,
  );

  if (!estaciones || estaciones.length === 0) {
    throw new Error(`No se encontraron estaciones IDEAM cercanas a lat:${lat}, lon:${lon}`);
  }

  // Ordenar por distancia
  const conDistancia = estaciones
    .filter((e) => e.latitud && e.longitud)
    .map((e) => ({
      ...e,
      distancia: this.haversineKm(lat, lon, parseFloat(e.latitud), parseFloat(e.longitud)),
    }))
    .sort((a, b) => a.distancia - b.distancia);

    this.logger.log(`Estaciones encontradas: ${conDistancia.length}`);
    this.logger.log(`Primeras 5: ${JSON.stringify(conDistancia.slice(0, 5).map(e => ({ codigo: e.codigo, nombre: e.nombre, dist: e.distancia })))}`);

  // Verificar cuál tiene datos reales (probar las primeras 5)
  for (const est of conDistancia.slice(0, 20)) {
    try {
      const check = await this.callWithRetry<IdeamTemperaturaRecord[]>(
        `${this.SOCRATA_BASE}/${this.DATASET_TEMPERATURA}.json?codigoestacion=${est.codigo}&$limit=1&$order=fechaobservacion DESC`,
      );
      if (check.length > 0) {
        const resultado = {
          codigo: est.codigo,
          nombre: est.nombre,
          distancia_km: Math.round(est.distancia * 10) / 10,
        };
        await this.cache.set(cacheKey, resultado, this.CACHE_TTL * 7);
        this.logger.log(`Estación con datos encontrada: ${est.nombre} (${est.codigo})`);
        return resultado;
      }
      this.logger.debug(`Estación sin datos: ${est.nombre} (${est.codigo})`);
    } catch {
      this.logger.debug(`Error verificando estación ${est.codigo}`);
    }
  }

  throw new Error(`Ninguna estación cercana tiene datos en el dataset de temperatura`);
}

  // ── Consultar temperaturas históricas ──
 private async fetchTemperaturas(
  codigoEstacion: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<IdeamTemperaturaRecord[]> {
  const url = `${this.SOCRATA_BASE}/${this.DATASET_TEMPERATURA}.json?` +
    `codigoestacion=${codigoEstacion}` +
    `&$where=fechaobservacion%20%3E%3D%20%27${fechaInicio}T00:00:00%27%20AND%20fechaobservacion%20%3C%3D%20%27${fechaFin}T23:59:59%27` +
    `&$limit=1000` +
    `&$order=fechaobservacion%20ASC`;
  
  this.logger.log(`URL temperatura: ${url}`);
  const result = await this.callWithRetry<IdeamTemperaturaRecord[]>(url);
  this.logger.log(`Registros temperatura: ${result.length}`);
  return result;
}

  // ── Consultar precipitaciones históricas ──
 private async fetchPrecipitaciones(
  codigoEstacion: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<IdeamPrecipitacionRecord[]> {
  const url = `${this.SOCRATA_BASE}/${this.DATASET_PRECIPITACION}.json?` +
    `codigoestacion=${codigoEstacion}` +
    `&$where=fechaobservacion%20%3E%3D%20%27${fechaInicio}T00:00:00%27%20AND%20fechaobservacion%20%3C%3D%20%27${fechaFin}T23:59:59%27` +
    `&$limit=1000` +
    `&$order=fechaobservacion%20ASC`;
  return this.callWithRetry<IdeamPrecipitacionRecord[]>(url);
}

  // ── Helper: distancia Haversine en km ──
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Helper: extraer lat/lon del campo PostGIS ──
  private extractCoords(parcela: Parcela): { lat: number; lon: number } {
    const ubicacion = parcela.ubicacion as any;
    if (ubicacion?.coordinates) return { lon: ubicacion.coordinates[0], lat: ubicacion.coordinates[1] };
    if (ubicacion?.lat !== undefined) return { lat: ubicacion.lat, lon: ubicacion.lon };
    if (ubicacion?.latitude !== undefined) return { lat: ubicacion.latitude, lon: ubicacion.longitude };
    throw new Error(`Parcela ${parcela.parcela_id} no tiene coordenadas válidas`);
  }

  // ── Helper: HTTP con retry exponencial ──
  private async callWithRetry<T>(url: string, attempt = 1): Promise<T> {
    try {
      const response = await axios.get<T>(url, {
        timeout: 30000,
        headers: { 'X-App-Token': '' }, // Token opcional para más límite de rate
      });
      return response.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt >= this.MAX_RETRIES) {
        this.logger.error(`IDEAM API falló después de ${this.MAX_RETRIES} intentos: ${msg}`);
        throw new Error(`Error al consultar IDEAM: ${msg}`);
      }
      const delay = Math.pow(2, attempt) * 1000;
      this.logger.warn(`Retry ${attempt}/${this.MAX_RETRIES} en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.callWithRetry<T>(url, attempt + 1);
    }
  }
}