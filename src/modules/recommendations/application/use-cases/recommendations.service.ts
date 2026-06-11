import {
    Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Recomendacion } from '@modules/recommendations/domain/entities/recomendacion.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';
import { CreateRecomendacionDto } from '@modules/recommendations/application/dto/create-recomendacion.dto';
import { UpdateRecomendacionDto } from '@modules/recommendations/application/dto/update-recomendacion.dto';
import { Rol, EstadoImplementacion, Prioridad } from '@common/enums/enums';
import { CatTipoRecomendacion } from '@modules/catalogs/domain/entities/cat-tipo-recomendacion.entity';

// ── Parámetros óptimos por cultivo (basados en AGRONET / AGROSAVIA Colombia) ──
const PARAMETROS_CULTIVO: Record<string, {
    nombre_display: string;
    ph_min: number; ph_max: number;
    temp_min: number; temp_max: number;
    altitud_min: number; altitud_max: number;
    precipitacion_90d_min: number; precipitacion_90d_max: number;
    humedad_min: number; humedad_max: number;
    ciclo_dias: number;
    rend_optimo: number;  // ton/ha referencia óptima
    enfermedades_lluvia: string;
    plagas_principales: string;
    fertilizacion_base: string;
    podas_recomendadas: string | null;
}> = {
    platano: {
        nombre_display: 'Plátano',
        ph_min: 5.5, ph_max: 7.0,
        temp_min: 22, temp_max: 30,
        altitud_min: 0, altitud_max: 1500,
        precipitacion_90d_min: 300, precipitacion_90d_max: 600,
        humedad_min: 70, humedad_max: 85,
        ciclo_dias: 300,
        rend_optimo: 30.0,
        enfermedades_lluvia: 'Sigatoka negra (Mycosphaerella fijiensis)',
        plagas_principales: 'picudo negro (Cosmopolites sordidus) y trips',
        fertilizacion_base: 'Fórmula 15-15-15 + K (150 kg/ha/año)',
        podas_recomendadas: 'deshije y deshoje cada 30-45 días',
    },
    cacao: {
        nombre_display: 'Cacao',
        ph_min: 5.0, ph_max: 7.0,
        temp_min: 24, temp_max: 30,
        altitud_min: 0, altitud_max: 1200,
        precipitacion_90d_min: 375, precipitacion_90d_max: 625,
        humedad_min: 70, humedad_max: 80,
        ciclo_dias: 160,
        rend_optimo: 1.2,
        enfermedades_lluvia: 'Moniliasis (Moniliophthora roreri) y Escoba de bruja',
        plagas_principales: 'trips, áfidos y barrenador del tallo',
        fertilizacion_base: 'N-P-K con énfasis en K y Mg (100-50-100 kg/ha/año)',
        podas_recomendadas: 'poda de mantenimiento y fitosanitaria cada cosecha',
    },
};

// ── Interfaces de contexto ──
interface ContextoActividades {
    diasDesdeUltimaFertilizacion: number | null;
    diasDesdeUltimoRiego: number | null;
    diasDesdeUltimoControlPlagas: number | null;
    diasDesdeUltimaPoda: number | null;
    nFertilizaciones90d: number;
    nRiegos90d: number;
    nControlPlagas90d: number;
    totalInsumos: number;
    actividadesRecientes: string[];
    tieneRiego: boolean;
}

interface ContextoPrediccion {
    cultivo: string;
    parametros: typeof PARAMETROS_CULTIVO[string];
    clima: Record<string, any>;
    rend: number;
    riesgo: string;
    ph: number | null;
    altitud: number | null;
    temp: number | null;
    precipitacion: number | null;
    humedad: number | null;
    actividades: ContextoActividades;
}

@Injectable()
export class RecommendationsService {
    constructor(
        @InjectRepository(Recomendacion)
        private readonly recomendacionRepo: Repository<Recomendacion>,
        @InjectRepository(Prediccion)
        private readonly prediccionRepo: Repository<Prediccion>,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
        @InjectRepository(CatTipoRecomendacion)
        private readonly tipoRecomRepo: Repository<CatTipoRecomendacion>,
        @InjectRepository(Actividad)
        private readonly actividadRepo: Repository<Actividad>,
    ) { }

    // ─────────────────────────── HELPERS ───────────────────────────

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

    /** Construye el contexto de actividades reales de los últimos 90 días */
    private async buildContextoActividades(
        parcelaId: string,
        _cultivoParcelaId: string | null,
    ): Promise<ContextoActividades> {
        const hace90 = new Date();
        hace90.setDate(hace90.getDate() - 90);

        const actividades = await this.actividadRepo
            .createQueryBuilder('act')
            .leftJoinAndSelect('act.tipoActividad', 'tipo')
            .where('act.parcela_id = :parcelaId', { parcelaId })
            .andWhere('act.fecha_realizacion >= :hace90', { hace90 })
            .orderBy('act.fecha_realizacion', 'DESC')
            .getMany();

        const hoy = new Date();
        const diasDesde = (fecha: Date) =>
            Math.floor((hoy.getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));

        let diasDesdeUltimaFertilizacion: number | null = null;
        let diasDesdeUltimoRiego: number | null = null;
        let diasDesdeUltimoControlPlagas: number | null = null;
        let diasDesdeUltimaPoda: number | null = null;
        let nFertilizaciones90d = 0;
        let nRiegos90d = 0;
        let nControlPlagas90d = 0;
        let totalInsumos = 0;
        const actividadesRecientes: string[] = [];
        let tieneRiego = false;

        for (const act of actividades) {
            const codigo = act.tipoActividad?.codigo ?? '';
            const d = diasDesde(act.fecha_realizacion);

            if (codigo === 'fertilizacion') {
                nFertilizaciones90d++;
                if (diasDesdeUltimaFertilizacion === null) diasDesdeUltimaFertilizacion = d;
            }
            if (codigo === 'riego') {
                nRiegos90d++;
                tieneRiego = true;
                if (diasDesdeUltimoRiego === null) diasDesdeUltimoRiego = d;
            }
            if (codigo === 'fumigacion' || codigo === 'control_plagas') {
                nControlPlagas90d++;
                if (diasDesdeUltimoControlPlagas === null) diasDesdeUltimoControlPlagas = d;
            }
            if (codigo === 'poda') {
                if (diasDesdeUltimaPoda === null) diasDesdeUltimaPoda = d;
            }
            if (act.descripcion && d <= 14) {
                actividadesRecientes.push(`${act.tipoActividad?.nombre ?? codigo} (hace ${d} días)`);
            }
        }

        // Contar insumos únicos aplicados
        const insumos = await this.actividadRepo
            .createQueryBuilder('act')
            .innerJoin('act.insumos', 'ins')
            .where('act.parcela_id = :parcelaId', { parcelaId })
            .andWhere('act.fecha_realizacion >= :hace90', { hace90 })
            .getCount();
        totalInsumos = insumos;

        return {
            diasDesdeUltimaFertilizacion,
            diasDesdeUltimoRiego,
            diasDesdeUltimoControlPlagas,
            diasDesdeUltimaPoda,
            nFertilizaciones90d,
            nRiegos90d,
            nControlPlagas90d,
            totalInsumos,
            actividadesRecientes,
            tieneRiego,
        };
    }

    /** Genera recomendaciones personalizadas según cultivo + datos reales */
    private generarRecomendacionesDeCultivo(
        ctx: ContextoPrediccion,
        tipoMap: Record<string, number>,
    ): Partial<Recomendacion>[] {
        const recs: Partial<Recomendacion>[] = [];
        const { parametros, rend, riesgo, ph, altitud, temp, precipitacion, humedad, actividades } = ctx;
        const nombreCultivo = parametros.nombre_display;

        // ── 1. Recomendación principal según nivel de riesgo ──
        if (riesgo === 'critico') {
            recs.push({
                tipo_recomendacion_id: tipoMap['general'] ?? 6,
                prioridad: Prioridad.URGENTE,
                titulo: `🚨 Intervención urgente en ${nombreCultivo}`,
                descripcion: `El modelo predice un rendimiento crítico de ${rend} ton/ha para tu ${nombreCultivo}. ` +
                    `El rendimiento óptimo esperado es ${parametros.rend_optimo} ton/ha. ` +
                    `Realiza una inspección inmediata del lote: revisa síntomas de enfermedades (especialmente ${parametros.enfermedades_lluvia}), ` +
                    `verifica el estado nutricional del suelo y consulta con un técnico agrícola esta semana.`,
            });
        } else if (riesgo === 'alto') {
            recs.push({
                tipo_recomendacion_id: tipoMap['general'] ?? 6,
                prioridad: Prioridad.ALTA,
                titulo: `⚠️ Riesgo alto en ${nombreCultivo} — acción requerida`,
                descripcion: `Rendimiento predicho: ${rend} ton/ha (referencia óptima: ${parametros.rend_optimo} ton/ha). ` +
                    `Para recuperar potencial productivo, prioriza: corrección nutricional con ${parametros.fertilizacion_base}, ` +
                    `manejo preventivo de ${parametros.plagas_principales}, y monitoreo climático diario.`,
            });
        } else if (riesgo === 'medio') {
            recs.push({
                tipo_recomendacion_id: tipoMap['general'] ?? 6,
                prioridad: Prioridad.MEDIA,
                titulo: `🌱 Oportunidad de mejora en ${nombreCultivo}`,
                descripcion: `Rendimiento predicho de ${rend} ton/ha. Con ajustes en fertilización y manejo, ` +
                    `puedes acercarte al óptimo de ${parametros.rend_optimo} ton/ha. ` +
                    `Revisa el plan de nutrición y el calendario de actividades.`,
            });
        } else {
            recs.push({
                tipo_recomendacion_id: tipoMap['general'] ?? 6,
                prioridad: Prioridad.BAJA,
                titulo: `✅ Buen rendimiento proyectado para ${nombreCultivo}`,
                descripcion: `Excelente predicción de ${rend} ton/ha para tu ${nombreCultivo}. ` +
                    `Mantén las prácticas actuales y realiza monitoreo preventivo de ${parametros.plagas_principales}. ` +
                    `${actividades.actividadesRecientes.length > 0 ? `Actividades recientes registradas: ${actividades.actividadesRecientes.join(', ')}.` : ''}`,
            });
        }

        // ── 2. Fertilización — basada en actividades reales ──
        const sinFertilizar = actividades.diasDesdeUltimaFertilizacion === null ||
            actividades.diasDesdeUltimaFertilizacion > 45;
        const pocaFertilizacion = actividades.nFertilizaciones90d < 2;

        if (sinFertilizar || pocaFertilizacion) {
            const diasMsg = actividades.diasDesdeUltimaFertilizacion !== null
                ? `La última fertilización fue hace ${actividades.diasDesdeUltimaFertilizacion} días.`
                : `No se registra fertilización en los últimos 90 días.`;

            recs.push({
                tipo_recomendacion_id: tipoMap['fertilizacion'] ?? 1,
                prioridad: riesgo === 'critico' || riesgo === 'alto' ? Prioridad.ALTA : Prioridad.MEDIA,
                titulo: `🧪 Aplicar fertilización para ${nombreCultivo}`,
                descripcion: `${diasMsg} Para ${nombreCultivo} se recomienda: ${parametros.fertilizacion_base}. ` +
                    `Realiza análisis de suelo previo para ajustar dosis según deficiencias específicas de tu parcela. ` +
                    `${ph !== null && (ph < parametros.ph_min || ph > parametros.ph_max)
                        ? `⚠️ pH actual (${ph}) fuera del rango óptimo (${parametros.ph_min}–${parametros.ph_max}): corrige con cal agrícola o azufre antes de fertilizar.`
                        : ''}`,
            });
        }

        // ── 3. Riego — según actividad real y condiciones climáticas ──
        const sinRiegoReciente = actividades.diasDesdeUltimoRiego === null ||
            actividades.diasDesdeUltimoRiego > 14;
        const deficitHidrico = precipitacion !== null && precipitacion < parametros.precipitacion_90d_min;

        if (!actividades.tieneRiego && deficitHidrico) {
            recs.push({
                tipo_recomendacion_id: tipoMap['riego'] ?? 2,
                prioridad: Prioridad.ALTA,
                titulo: `💧 Implementar sistema de riego para ${nombreCultivo}`,
                descripcion: `Con solo ${precipitacion} mm de lluvia en 90 días (mínimo recomendado: ${parametros.precipitacion_90d_min} mm) ` +
                    `y sin sistema de riego registrado, tu ${nombreCultivo} está en déficit hídrico. ` +
                    `Considera riego por goteo o aspersión. Sin agua suficiente el rendimiento se reduce hasta un 40%.`,
            });
        } else if (actividades.tieneRiego && sinRiegoReciente && deficitHidrico) {
            recs.push({
                tipo_recomendacion_id: tipoMap['riego'] ?? 2,
                prioridad: Prioridad.ALTA,
                titulo: `💧 Aumentar frecuencia de riego en ${nombreCultivo}`,
                descripcion: `Han pasado ${actividades.diasDesdeUltimoRiego} días desde el último riego registrado. ` +
                    `Con ${precipitacion} mm de precipitación (por debajo del mínimo de ${parametros.precipitacion_90d_min} mm/90d), ` +
                    `el ${nombreCultivo} requiere riego inmediato. Ajusta la frecuencia según etapa fenológica del cultivo.`,
            });
        }

        // ── 4. Exceso de lluvia — riesgo de enfermedades fúngicas ──
        const excessoLluvia = precipitacion !== null && precipitacion > parametros.precipitacion_90d_max;
        if (excessoLluvia) {
            recs.push({
                tipo_recomendacion_id: tipoMap['plagas'] ?? 3,
                prioridad: Prioridad.ALTA,
                titulo: `🌧️ Exceso de lluvia — riesgo de ${parametros.enfermedades_lluvia.split('(')[0].trim()}`,
                descripcion: `Se registraron ${precipitacion} mm en 90 días (máximo recomendado: ${parametros.precipitacion_90d_max} mm). ` +
                    `El exceso de humedad favorece ${parametros.enfermedades_lluvia}. ` +
                    `Acciones inmediatas: 1) Aplica fungicidas preventivos. 2) Mejora el drenaje entre surcos. ` +
                    `3) Realiza inspección visual cada 5 días buscando síntomas tempranos.`,
            });
        }

        // ── 5. Control de plagas — basado en actividades reales ──
        const sinControlReciente = actividades.diasDesdeUltimoControlPlagas === null ||
            actividades.diasDesdeUltimoControlPlagas > 30;
        const condicionesFavorablesPlagas = (humedad !== null && humedad > parametros.humedad_max) || excessoLluvia;

        if (sinControlReciente || condicionesFavorablesPlagas) {
            const contextoMsg = condicionesFavorablesPlagas
                ? `Las condiciones actuales de humedad (${humedad}%) favorecen la aparición de ${parametros.plagas_principales}.`
                : `No se registra control de plagas en los últimos ${actividades.diasDesdeUltimoControlPlagas ?? 90} días.`;

            recs.push({
                tipo_recomendacion_id: tipoMap['plagas'] ?? 3,
                prioridad: condicionesFavorablesPlagas ? Prioridad.ALTA : Prioridad.MEDIA,
                titulo: `🦟 Monitorear ${parametros.plagas_principales.split('(')[0].trim()} en ${nombreCultivo}`,
                descripcion: `${contextoMsg} ` +
                    `Para ${nombreCultivo} las principales amenazas son: ${parametros.plagas_principales}. ` +
                    `Realiza trampeo y muestreo (mínimo 10 plantas/ha). Aplica control solo si supera el umbral económico.`,
            });
        }

        // ── 6. Poda (solo cultivos que la requieren) ──
        if (parametros.podas_recomendadas !== null) {
            const sinPodaReciente = actividades.diasDesdeUltimaPoda === null ||
                actividades.diasDesdeUltimaPoda > 60;
            if (sinPodaReciente) {
                const diasPoda = actividades.diasDesdeUltimaPoda ?? 'más de 90';
                recs.push({
                    tipo_recomendacion_id: tipoMap['siembra'] ?? 4,
                    prioridad: Prioridad.MEDIA,
                    titulo: `✂️ Realizar poda de ${nombreCultivo}`,
                    descripcion: `Hace ${diasPoda} días sin poda registrada. Para ${nombreCultivo} se recomienda ${parametros.podas_recomendadas}. ` +
                        `La poda oportuna mejora la aireación del cultivo, reduce la incidencia de enfermedades ` +
                        `y puede incrementar el rendimiento hasta un 15%.`,
                });
            }
        }

        // ── 7. Condiciones edafoclimáticas fuera de rango ──
        if (ph !== null && ph < parametros.ph_min) {
            recs.push({
                tipo_recomendacion_id: tipoMap['fertilizacion'] ?? 1,
                prioridad: Prioridad.ALTA,
                titulo: `⚗️ pH ácido (${ph}) — encalar para ${nombreCultivo}`,
                descripcion: `El pH de ${ph} está por debajo del mínimo óptimo (${parametros.ph_min}) para ${nombreCultivo}. ` +
                    `Aplica cal dolomítica (500–1000 kg/ha según análisis de suelo) al menos 30 días antes de la siguiente fertilización. ` +
                    `Un pH corregido puede mejorar la disponibilidad de nutrientes hasta un 30%.`,
            });
        }
        if (ph !== null && ph > parametros.ph_max) {
            recs.push({
                tipo_recomendacion_id: tipoMap['fertilizacion'] ?? 1,
                prioridad: Prioridad.MEDIA,
                titulo: `⚗️ pH alcalino (${ph}) — acidificar para ${nombreCultivo}`,
                descripcion: `El pH de ${ph} supera el máximo óptimo (${parametros.ph_max}) para ${nombreCultivo}. ` +
                    `Aplica azufre elemental (200–400 kg/ha) o fertilizantes acidificantes como sulfato de amonio. ` +
                    `Realiza análisis de suelo cada 6 meses para monitorear el ajuste.`,
            });
        }

        if (altitud !== null && (altitud < parametros.altitud_min || altitud > parametros.altitud_max)) {
            recs.push({
                tipo_recomendacion_id: tipoMap['siembra'] ?? 4,
                prioridad: Prioridad.MEDIA,
                titulo: `🏔️ Altitud fuera del rango óptimo para ${nombreCultivo}`,
                descripcion: `La parcela está a ${altitud} msnm. El ${nombreCultivo} se desarrolla mejor entre ` +
                    `${parametros.altitud_min} y ${parametros.altitud_max} msnm. ` +
                    `Considera variedades adaptadas a tu altitud o consulta con AGROSAVIA la variedad más adecuada para tu zona.`,
            });
        }

        if (temp !== null && temp < parametros.temp_min) {
            recs.push({
                tipo_recomendacion_id: tipoMap['general'] ?? 6,
                prioridad: Prioridad.ALTA,
                titulo: `🌡️ Temperatura baja (${temp}°C) — proteger ${nombreCultivo}`,
                descripcion: `Temperatura actual de ${temp}°C por debajo del mínimo óptimo (${parametros.temp_min}°C) para ${nombreCultivo}. ` +
                    `Riesgo de daño por frío en etapas críticas (floración y llenado). ` +
                    `Aplica riego nocturno ligero como protección antihielo si la temperatura baja de 8°C.`,
            });
        }
        if (temp !== null && temp > parametros.temp_max) {
            recs.push({
                tipo_recomendacion_id: tipoMap['riego'] ?? 2,
                prioridad: Prioridad.MEDIA,
                titulo: `🌡️ Estrés térmico (${temp}°C) en ${nombreCultivo}`,
                descripcion: `Temperatura de ${temp}°C sobre el máximo óptimo (${parametros.temp_max}°C). ` +
                    `El calor excesivo reduce la fotosíntesis y puede causar aborto de flores/frutos. ` +
                    `Aumenta la frecuencia de riego y considera coberturas o sombrío temporal.`,
            });
        }

        // ── 8. Planificación de cosecha ──
        if (riesgo === 'bajo' || riesgo === 'medio') {
            recs.push({
                tipo_recomendacion_id: tipoMap['cosecha'] ?? 5,
                prioridad: Prioridad.BAJA,
                titulo: `🌾 Planificar cosecha de ${nombreCultivo}`,
                descripcion: `Con ${rend} ton/ha proyectadas, planifica con antelación: ` +
                    `mano de obra (estimar ${Math.ceil(rend * 2)} jornales/ha), empaques, transporte y punto de venta. ` +
                    `Para ${nombreCultivo}, la cosecha en el momento óptimo de madurez maximiza el precio y reduce pérdidas poscosecha.`,
            });
        }

        // ── 9. Registro en bitácora (siempre) ──
        recs.push({
            tipo_recomendacion_id: tipoMap['general'] ?? 6,
            prioridad: Prioridad.BAJA,
            titulo: '📋 Mantener bitácora de actividades actualizada',
            descripcion: `Llevar registro detallado de fertilizaciones, riegos y controles fitosanitarios mejora la ` +
                `precisión del modelo ML en futuras predicciones. ` +
                `${actividades.totalInsumos > 0
                    ? `Se registraron ${actividades.totalInsumos} aplicaciones de insumos en los últimos 90 días.`
                    : 'Aún no se registran insumos aplicados en los últimos 90 días.'}`,
        });

        return recs;
    }

    // ─────────────────────────── CRUD BASE ───────────────────────────

    async create(dto: CreateRecomendacionDto): Promise<Recomendacion> {
        const prediccion = await this.prediccionRepo.findOne({ where: { prediccion_id: dto.prediccion_id } });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        const rec = this.recomendacionRepo.create(dto);
        return this.recomendacionRepo.save(rec);
    }

    async findByPrediccion(prediccionId: string, usuarioId: string, rol: Rol): Promise<Recomendacion[]> {
        const prediccion = await this.prediccionRepo.findOne({ where: { prediccion_id: prediccionId } });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        await this.verificarAccesoParcela(prediccion.parcela_id, usuarioId, rol);
        return this.recomendacionRepo.find({
            where: { prediccion_id: prediccionId },
            relations: ['tipoRecomendacion', 'documentoFuente'],
            order: { prioridad: 'ASC' },
        });
    }

    async findByParcela(parcelaId: string, usuarioId: string, rol: Rol): Promise<Recomendacion[]> {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);
        return this.recomendacionRepo
            .createQueryBuilder('rec')
            .innerJoin('rec.prediccion', 'pred')
            .leftJoinAndSelect('rec.tipoRecomendacion', 'tipo')
            .where('pred.parcela_id = :parcelaId', { parcelaId })
            .orderBy('rec.creado_en', 'DESC')
            .getMany();
    }

    async findPendientes(usuarioId: string, rol: Rol): Promise<Recomendacion[]> {
        const qb = this.recomendacionRepo
            .createQueryBuilder('rec')
            .innerJoinAndSelect('rec.prediccion', 'pred')
            .innerJoinAndSelect('pred.parcela', 'parcela')
            .leftJoinAndSelect('rec.tipoRecomendacion', 'tipo')
            .where('rec.estado_implementacion = :estado', { estado: EstadoImplementacion.PENDIENTE });
        if (rol === Rol.AGRICULTOR) {
            qb.innerJoin('parcela.agricultor', 'agri').andWhere('agri.usuario_id = :usuarioId', { usuarioId });
        }
        return qb.orderBy('rec.creado_en', 'DESC').getMany();
    }

    async findOne(recomendacionId: string, usuarioId: string, rol: Rol): Promise<Recomendacion> {
        const rec = await this.recomendacionRepo.findOne({
            where: { recomendacion_id: recomendacionId },
            relations: ['tipoRecomendacion', 'prediccion', 'prediccion.parcela', 'documentoFuente'],
        });
        if (!rec) throw new NotFoundException('Recomendación no encontrada');
        await this.verificarAccesoParcela(rec.prediccion.parcela_id, usuarioId, rol);
        return rec;
    }

    async update(recomendacionId: string, usuarioId: string, rol: Rol, dto: UpdateRecomendacionDto): Promise<Recomendacion> {
        const rec = await this.findOne(recomendacionId, usuarioId, rol);
        Object.assign(rec, dto);
        return this.recomendacionRepo.save(rec);
    }

    async remove(recomendacionId: string): Promise<void> {
        const rec = await this.recomendacionRepo.findOne({ where: { recomendacion_id: recomendacionId } });
        if (!rec) throw new NotFoundException('Recomendación no encontrada');
        await this.recomendacionRepo.remove(rec);
    }

    async findAll(limit = 50): Promise<Recomendacion[]> {
        return this.recomendacionRepo.find({
            relations: ['tipoRecomendacion', 'prediccion'],
            order: { creado_en: 'DESC' },
            take: limit,
        });
    }

    // ─────────────────────────── GENERACIÓN PRINCIPAL ───────────────────────────

    async generarParaPrediccion(prediccionId: string): Promise<Recomendacion[]> {
        // Cargar predicción con relaciones
        const prediccion = await this.prediccionRepo.findOne({
            where: { prediccion_id: prediccionId },
            relations: ['tipoCultivo', 'parcela'],
        });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');

        // Cargar cultivo_parcela si es necesario en el futuro
        // const cultivoParcela = ...

        // Tipos de recomendación
        const tipos = await this.tipoRecomRepo.find();
        const tipoMap: Record<string, number> = {};
        for (const t of tipos) { tipoMap[t.codigo] = t.id; }

        // Borrar recomendaciones previas de esta predicción
        await this.recomendacionRepo.delete({ prediccion_id: prediccionId });

        // Extraer datos
        const rend = Number(prediccion.rendimiento_predicho_ton);
        const riesgo = prediccion.nivel_riesgo;
        const clima = (prediccion.datos_clima_usados || {}) as Record<string, any>;
        const factores = (prediccion.factores_riesgo || {}) as Record<string, any>;

        const nombreCultivo = (prediccion.tipoCultivo?.nombre ?? factores?.cultivo ?? 'desconocido').toLowerCase();
        const parametros = PARAMETROS_CULTIVO[nombreCultivo] ?? PARAMETROS_CULTIVO['platano'];

        const ph = prediccion.parcela?.ph_suelo ? Number(prediccion.parcela.ph_suelo) : null;
        const altitud = prediccion.parcela?.altitud_msnm ? Number(prediccion.parcela.altitud_msnm) : null;
        const temp = clima.temp_promedio ? Number(clima.temp_promedio) : null;
        const precipitacion = clima.precipitacion_mm_90d ? Number(clima.precipitacion_mm_90d) : null;
        const humedad = clima.humedad_pct ? Number(clima.humedad_pct) : null;

        // Contexto de actividades reales
        const actividades = await this.buildContextoActividades(
            prediccion.parcela_id,
            prediccion.cultivo_parcela_id,
        );

        const contexto: ContextoPrediccion = {
            cultivo: nombreCultivo,
            parametros,
            clima,
            rend,
            riesgo,
            ph,
            altitud,
            temp,
            precipitacion,
            humedad,
            actividades,
        };

        // Generar recomendaciones personalizadas
        const recomendaciones = this.generarRecomendacionesDeCultivo(contexto, tipoMap);

        // Asignar prediccion_id y guardar
        const guardadas: Recomendacion[] = [];
        for (const r of recomendaciones) {
            const entidad = this.recomendacionRepo.create({
                ...r,
                prediccion_id: prediccionId,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            } as Recomendacion);
            guardadas.push(await this.recomendacionRepo.save(entidad));
        }

        return guardadas;
    }
}