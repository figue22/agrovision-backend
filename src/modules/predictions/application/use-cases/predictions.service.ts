import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { CreatePrediccionDto } from '@modules/predictions/application/dto/create-prediccion.dto';
import { UpdatePrediccionDto } from '@modules/predictions/application/dto/update-prediccion.dto';
import { MlService } from '@modules/predictions/application/use-cases/ml.service';
import { Rol, NivelRiesgo } from '@common/enums/enums';
import { RecommendationsService } from '@modules/recommendations/application/use-cases/recommendations.service';

@Injectable()
export class PredictionsService {
    private readonly logger = new Logger(PredictionsService.name);

    constructor(
        @InjectRepository(Prediccion)
        private readonly prediccionRepo: Repository<Prediccion>,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
        @InjectRepository(CultivoParcela)
        private readonly cultivoParcelaRepo: Repository<CultivoParcela>,
        @InjectRepository(TipoCultivo)
        private readonly tipoCultivoRepo: Repository<TipoCultivo>,
        @InjectRepository(DatoClimatico)
        private readonly climaRepo: Repository<DatoClimatico>,
        @InjectRepository(Agricultor)
        private readonly agricultorRepo: Repository<Agricultor>,
        private readonly mlService: MlService,
        @Inject(forwardRef(() => RecommendationsService))
        private readonly recommendationsService: RecommendationsService,
    ) {}

    private async verificarAccesoParcela(parcelaId: string, usuarioId: string, rol: Rol): Promise<void> {
        const parcela = await this.parcelaRepo.findOne({
            where: { parcela_id: parcelaId },
            relations: ['agricultor'],
        });
        if (!parcela) throw new NotFoundException('Parcela no encontrada');
        if (rol === Rol.AGRICULTOR && parcela.agricultor?.usuario_id !== usuarioId) {
            throw new ForbiddenException('No tienes acceso a esta parcela');
        }
    }

    private async construirDatosAgronomicos(
        parcela: Parcela,
        cultivoParcela: CultivoParcela | null,
        tipoCultivo: TipoCultivo | null,
        municipio: string,
        datosExtra: object,
    ): Promise<object> {
        // ── 1. Nombre cultivo normalizado ──
        const nombreCultivo = tipoCultivo?.nombre?.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_') || 'platano';

        // ── 2. Días desde siembra ──
        let diasDesdeSiembra = 90;
        let fechaSiembra: string | undefined;
        if (cultivoParcela?.fecha_siembra) {
            const fs = new Date(cultivoParcela.fecha_siembra);
            diasDesdeSiembra = Math.max(1, Math.floor(
                (Date.now() - fs.getTime()) / (1000 * 60 * 60 * 24),
            ));
            fechaSiembra = fs.toISOString().split('T')[0];
        }

        // ── 3. Datos climáticos reales últimos 90 días ──
        const hace90 = new Date();
        hace90.setDate(hace90.getDate() - 90);

        const datosClima = await this.climaRepo
            .createQueryBuilder('c')
            .where('c.parcela_id = :id', { id: parcela.parcela_id })
            .andWhere('c.fecha >= :fecha', { fecha: hace90.toISOString().split('T')[0] })
            .andWhere('c.fuente != :fuente', { fuente: 'openweathermap_forecast' })
            .orderBy('c.fecha', 'DESC')
            .take(90)
            .getMany();

        let tempProm = 24, tempMax = 29, tempMin = 19;
        let precipAcum = 300, humedadProm = 75;
        let vientoProm = 2.0, radProm = 4.5;
        let diasSinLluvia = 5;

        if (datosClima.length > 0) {
            const avg = (arr: number[]) => arr.length > 0
                ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

            const temps = datosClima.filter(d => d.temp_promedio != null).map(d => Number(d.temp_promedio));
            const maxs = datosClima.filter(d => d.temp_maxima != null).map(d => Number(d.temp_maxima));
            const mins = datosClima.filter(d => d.temp_minima != null).map(d => Number(d.temp_minima));
            const precips = datosClima.filter(d => d.precipitacion_mm != null).map(d => Number(d.precipitacion_mm));
            const humeds = datosClima.filter(d => d.humedad_pct != null).map(d => Number(d.humedad_pct));
            const vientos = datosClima.filter(d => d.velocidad_viento != null).map(d => Number(d.velocidad_viento));

            if (avg(temps)) tempProm = avg(temps)!;
            if (avg(maxs)) tempMax = avg(maxs)!;
            if (avg(mins)) tempMin = avg(mins)!;
            if (precips.length > 0) precipAcum = precips.reduce((a, b) => a + b, 0);
            if (avg(humeds)) humedadProm = avg(humeds)!;
            if (avg(vientos)) vientoProm = avg(vientos)!;

            let dsl = 0;
            for (const d of datosClima) {
                if (Number(d.precipitacion_mm) < 1) dsl++;
                else break;
            }
            diasSinLluvia = dsl;
        }

        // Serie temporal 30 días para LSTM
        const serie30 = datosClima.slice(0, 30).map(d => ({
            temp_promedio_c: Number(d.temp_promedio) || tempProm,
            temp_maxima_c: Number(d.temp_maxima) || tempMax,
            temp_minima_c: Number(d.temp_minima) || tempMin,
            precipitacion_mm_90d: Number(d.precipitacion_mm) || 0,
            humedad_promedio_pct: Number(d.humedad_pct) || humedadProm,
            dias_sin_lluvia: diasSinLluvia,
            velocidad_viento_ms: Number(d.velocidad_viento) || vientoProm,
            radiacion_solar_kwh: radProm,
        }));

        // ── 4. Departamento desde municipio ──
        const MUNICIPIO_DPTO: Record<string, string> = {
            'manizales': 'Caldas', 'medellin': 'Antioquia', 'bogota': 'Cundinamarca',
            'cali': 'Valle', 'ibague': 'Tolima', 'neiva': 'Huila',
            'bucaramanga': 'Santander', 'pasto': 'Nariño', 'popayan': 'Cauca',
            'villavicencio': 'Meta', 'armenia': 'Quindio', 'pereira': 'Risaralda',
        };
        const munNorm = municipio.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const departamento = MUNICIPIO_DPTO[munNorm] || 'Caldas';

        // ── 5. Datos suelo y cultivo ──
        const phSuelo = Number(parcela.ph_suelo) || 6.0;
        const altitudMsnm = Number(parcela.altitud_msnm) || 500;
        const tipoSuelo = parcela.tipo_suelo || 'franco';
        const areaSembrada = Number(cultivoParcela?.area_sembrada_ha)
            || Number(parcela.area_hectareas) || 1.0;

        return {
            cultivo: nombreCultivo,
            departamento,
            tipo_suelo: tipoSuelo,
            ph_suelo: phSuelo,
            altitud_msnm: altitudMsnm,
            area_sembrada_ha: areaSembrada,
            dias_desde_siembra: diasDesdeSiembra,
            fecha_siembra: fechaSiembra,
            temp_promedio_c: Math.round(tempProm * 10) / 10,
            temp_maxima_c: Math.round(tempMax * 10) / 10,
            temp_minima_c: Math.round(tempMin * 10) / 10,
            precipitacion_mm_90d: Math.round(precipAcum),
            humedad_promedio_pct: Math.round(humedadProm),
            dias_sin_lluvia: diasSinLluvia,
            velocidad_viento_ms: Math.round(vientoProm * 10) / 10,
            radiacion_solar_kwh: radProm,
            datos_clima: serie30,
            materia_organica_pct: 3.0,
            nitrogeno_ppm: 30,
            fosforo_ppm: 20,
            potasio_meq: 0.5,
            variedad: 'mejorada',
            tipo_labranza: 'convencional',
            densidad_siembra_rel: 1.0,
            nivel_fertilizacion: 1,
            tiene_riego: 0,
            nivel_control_plagas: 1,
            ...(datosExtra as object),
        };
    }

    async create(dto: CreatePrediccionDto, usuarioId: string, rol: Rol): Promise<Prediccion> {
        const parcela = await this.parcelaRepo.findOne({
            where: { parcela_id: dto.parcela_id },
            relations: ['agricultor'],
        });
        if (!parcela) throw new NotFoundException('Parcela no encontrada');

        await this.verificarAccesoParcela(dto.parcela_id, usuarioId, rol);

        // ── Cargar cultivo y tipo cultivo ──
        let cultivoParcela: CultivoParcela | null = null;
        let tipoCultivo: TipoCultivo | null = null;

        if (dto.cultivo_parcela_id) {
            cultivoParcela = await this.cultivoParcelaRepo.findOne({
                where: { cultivo_parcela_id: dto.cultivo_parcela_id },
                relations: ['tipoCultivo'],
            });
            tipoCultivo = cultivoParcela?.tipoCultivo || null;
        }

        if (!tipoCultivo && dto.tipo_cultivo_id) {
            tipoCultivo = await this.tipoCultivoRepo.findOne({
                where: { tipo_cultivo_id: dto.tipo_cultivo_id },
            });
        }

        // ── Municipio del agricultor ──
        const agricultor = await this.agricultorRepo.findOne({
            where: { agricultor_id: parcela.agricultor_id },
        });
        const municipio = agricultor?.municipio || 'Manizales';

        // ── Construir datos agronómicos desde BD ──
        const datosAgronomicos = await this.construirDatosAgronomicos(
            parcela,
            cultivoParcela,
            tipoCultivo,
            municipio,
            (dto.datos_agronomicos as object) || {},
        );

        this.logger.log(
            `Predicción "${parcela.nombre}" | cultivo: ${(datosAgronomicos as any).cultivo} | ` +
            `temp: ${(datosAgronomicos as any).temp_promedio_c}°C | ` +
            `precip: ${(datosAgronomicos as any).precipitacion_mm_90d}mm | ` +
            `dias_siembra: ${(datosAgronomicos as any).dias_desde_siembra}`,
        );

        // ── Llamar al ML ──
        let mlResult: any = null;
        try {
            mlResult = await this.mlService.predict({
                parcela_id: dto.parcela_id,
                cultivo_parcela_id: dto.cultivo_parcela_id || '',
                tipo_cultivo_id: dto.tipo_cultivo_id,
                modelo: dto.modelo || 'ensemble',
                datos_agronomicos: datosAgronomicos as any,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error llamando al ML: ${msg}`);
        }

        // ── Guardar predicción ──
        const prediccion = this.prediccionRepo.create({
            parcela_id: dto.parcela_id,
            cultivo_parcela_id: dto.cultivo_parcela_id,
            tipo_cultivo_id: dto.tipo_cultivo_id,
            version_modelo: mlResult?.version_modelo || '1.0.0',
            tipo_modelo: mlResult?.tipo_modelo || dto.modelo || 'ensemble',
            rendimiento_predicho_ton: mlResult?.rendimiento_predicho_ton || 0,
            puntaje_confianza: mlResult?.puntaje_confianza || 0,
            intervalo_conf_inferior: mlResult?.intervalo_conf_inferior || 0,
            intervalo_conf_superior: mlResult?.intervalo_conf_superior || 0,
            nivel_riesgo: (mlResult?.nivel_riesgo as NivelRiesgo) || NivelRiesgo.MEDIO,
            factores_riesgo: mlResult?.factores_riesgo || {},
            datos_clima_usados: mlResult?.datos_clima_usados || datosAgronomicos,
            importancia_features: mlResult?.importancia_features || {},
            fecha_prediccion: mlResult?.fecha_prediccion
                ? new Date(mlResult.fecha_prediccion) : new Date(),
            fecha_cosecha_estimada: mlResult?.fecha_cosecha_estimada
             ? new Date(mlResult.fecha_cosecha_estimada) : undefined,
            dias_para_cosecha: mlResult?.dias_para_cosecha ?? undefined,
        });

        const saved = await this.prediccionRepo.save(prediccion);

        // ── Actualizar cultivo con resultados de la predicción ──
        if (dto.cultivo_parcela_id && mlResult) {
            try {
                const updateData: Partial<CultivoParcela> = {};

                if (mlResult.fecha_cosecha_estimada) {
                    updateData.fecha_cosecha_esperada = new Date(mlResult.fecha_cosecha_estimada);
                }
                if (mlResult.rendimiento_predicho_ton) {
                    updateData.rendimiento_esperado_ton = mlResult.rendimiento_predicho_ton;
                }

                if (Object.keys(updateData).length > 0) {
                    await this.cultivoParcelaRepo.update(
                        { cultivo_parcela_id: dto.cultivo_parcela_id },
                        updateData,
                    );
                    this.logger.log(
                        `Cultivo ${dto.cultivo_parcela_id} actualizado: ` +
                        `rendimiento=${mlResult.rendimiento_predicho_ton} ton/ha`,
                    );
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`No se pudo actualizar el cultivo: ${msg}`);
            }
        }

        // ── Generar recomendaciones automáticas ──
        try {
            await this.recommendationsService.generarParaPrediccion(saved.prediccion_id);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`No se pudieron generar recomendaciones: ${msg}`);
        }

        return saved;
    }

    async findByParcela(parcelaId: string, usuarioId: string, rol: Rol): Promise<Prediccion[]> {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);
        return this.prediccionRepo.find({
            where: { parcela_id: parcelaId },
            relations: ['tipoCultivo', 'cultivoParcela', 'recomendaciones'],
            order: { fecha_prediccion: 'DESC' },
        });
    }

    async findLatestByParcela(parcelaId: string, usuarioId: string, rol: Rol): Promise<Prediccion | null> {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);
        return this.prediccionRepo.findOne({
            where: { parcela_id: parcelaId },
            relations: ['tipoCultivo', 'cultivoParcela', 'recomendaciones', 'recomendaciones.tipoRecomendacion'],
            order: { fecha_prediccion: 'DESC' },
        });
    }

    async findOne(prediccionId: string, usuarioId: string, rol: Rol): Promise<Prediccion> {
        const prediccion = await this.prediccionRepo.findOne({
            where: { prediccion_id: prediccionId },
            relations: ['tipoCultivo', 'cultivoParcela', 'parcela', 'recomendaciones', 'recomendaciones.tipoRecomendacion'],
        });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        await this.verificarAccesoParcela(prediccion.parcela_id, usuarioId, rol);
        return prediccion;
    }

    async update(prediccionId: string, dto: UpdatePrediccionDto): Promise<Prediccion> {
        const prediccion = await this.prediccionRepo.findOne({
            where: { prediccion_id: prediccionId },
        });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        Object.assign(prediccion, dto);
        return this.prediccionRepo.save(prediccion);
    }

    async remove(prediccionId: string): Promise<void> {
        const prediccion = await this.prediccionRepo.findOne({
            where: { prediccion_id: prediccionId },
        });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        await this.prediccionRepo.remove(prediccion);
    }

    async findAll(limit = 50): Promise<Prediccion[]> {
        return this.prediccionRepo.find({
            relations: ['tipoCultivo', 'parcela'],
            order: { fecha_prediccion: 'DESC' },
            take: limit,
        });
    }
}