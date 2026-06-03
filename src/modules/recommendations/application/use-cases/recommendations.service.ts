import {
    Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Recomendacion } from '@modules/recommendations/domain/entities/recomendacion.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CreateRecomendacionDto } from '@modules/recommendations/application/dto/create-recomendacion.dto';
import { UpdateRecomendacionDto } from '@modules/recommendations/application/dto/update-recomendacion.dto';
import { Rol, EstadoImplementacion, Prioridad } from '@common/enums/enums';
import { CatTipoRecomendacion } from '@modules/catalogs/domain/entities/cat-tipo-recomendacion.entity';

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
    ) { }

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
            qb.innerJoin('parcela.agricultor', 'agri')
                .andWhere('agri.usuario_id = :usuarioId', { usuarioId });
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

    async generarParaPrediccion(prediccionId: string): Promise<Recomendacion[]> {
        const prediccion = await this.prediccionRepo.findOne({
            where: { prediccion_id: prediccionId },
            relations: ['tipoCultivo'],
        });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');

        // Obtener tipos de recomendación por código
        const tipos = await this.tipoRecomRepo.find();
        const tipoMap: Record<string, number> = {};
        for (const t of tipos) {
            tipoMap[t.codigo] = t.id;
        }

        // Eliminar recomendaciones previas
        await this.recomendacionRepo.delete({ prediccion_id: prediccionId });

        const recomendaciones: Partial<Recomendacion>[] = [];
        const rend = Number(prediccion.rendimiento_predicho_ton);
        const riesgo = prediccion.nivel_riesgo;
        const clima = (prediccion.datos_clima_usados || {}) as any;

        // ── Evaluar condiciones climáticas ──
        const tempBaja = clima.temp_promedio && Number(clima.temp_promedio) < 15;
        const tempAlta = clima.temp_promedio && Number(clima.temp_promedio) > 28;
        const pocaLluvia = clima.precipitacion_mm_90d && Number(clima.precipitacion_mm_90d) < 200;
        const muchaLluvia = clima.precipitacion_mm_90d && Number(clima.precipitacion_mm_90d) > 800;
        const humedadAlta = clima.humedad_pct && Number(clima.humedad_pct) > 85;

        // ── Recomendaciones por nivel de riesgo ──
        if (riesgo === 'critico' || riesgo === 'alto') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['general'] || 6,
                prioridad: Prioridad.URGENTE,
                titulo: '🚨 Revisión urgente del cultivo requerida',
                descripcion: `El modelo predice un rendimiento de ${rend} ton/ha con nivel de riesgo ${riesgo}. Se recomienda inspección inmediata del cultivo para identificar causas y tomar acciones correctivas.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });

            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['fertilizacion'] || 1,
                prioridad: Prioridad.ALTA,
                titulo: '🧪 Plan de fertilización intensivo',
                descripcion: 'Para mejorar el rendimiento predicho, implementa un plan de fertilización completo con análisis de suelo previo. Prioriza nitrógeno, fósforo y potasio según deficiencias identificadas.',
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (riesgo === 'alto' || riesgo === 'critico') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['riego'] || 2,
                prioridad: Prioridad.ALTA,
                titulo: '💧 Optimizar sistema de riego',
                descripcion: 'Las condiciones climáticas y el rendimiento predicho sugieren déficit hídrico. Evalúa aumentar la frecuencia de riego y verifica la eficiencia del sistema de distribución de agua.',
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (riesgo === 'medio') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['general'] || 6,
                prioridad: Prioridad.MEDIA,
                titulo: '🌱 Ajuste de prácticas agrícolas',
                descripcion: `Rendimiento predicho de ${rend} ton/ha. Para mejorar, considera optimizar la densidad de siembra, ajustar el calendario de fertilización y reforzar el control de plagas.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (riesgo === 'bajo') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['general'] || 6,
                prioridad: Prioridad.BAJA,
                titulo: '✅ Mantener prácticas actuales',
                descripcion: `Excelente predicción de ${rend} ton/ha. Mantén las prácticas agrícolas actuales y realiza monitoreo periódico para sostener el rendimiento.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        // ── Recomendaciones por condiciones climáticas ──
        if (pocaLluvia) {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['riego'] || 2,
                prioridad: Prioridad.ALTA,
                titulo: '💧 Déficit hídrico detectado',
                descripcion: `Se registraron solo ${clima.precipitacion_mm_90d} mm en los últimos 90 días. Aumenta la frecuencia de riego y considera sistemas de retención de humedad en el suelo.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (muchaLluvia) {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['plagas'] || 3,
                prioridad: Prioridad.MEDIA,
                titulo: '🌧️ Exceso de lluvia — riesgo de hongos',
                descripcion: `Se registraron ${clima.precipitacion_mm_90d} mm en los últimos 90 días. El exceso de humedad favorece enfermedades fúngicas. Aplica fungicidas preventivos y mejora el drenaje.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (humedadAlta) {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['plagas'] || 3,
                prioridad: Prioridad.MEDIA,
                titulo: '🦟 Condiciones favorables para plagas',
                descripcion: `Humedad del ${clima.humedad_pct}% favorece aparición de plagas y enfermedades. Realiza inspección preventiva y considera aplicación de insecticidas/fungicidas según el cultivo.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (tempBaja) {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['general'] || 6,
                prioridad: Prioridad.ALTA,
                titulo: '🌡️ Temperatura baja — riesgo de helada',
                descripcion: `Temperatura de ${clima.temp_promedio}°C puede afectar el desarrollo del cultivo. Protege los cultivos sensibles y monitorea las temperaturas nocturnas.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (tempAlta) {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['riego'] || 2,
                prioridad: Prioridad.MEDIA,
                titulo: '🌡️ Temperatura alta — estrés térmico',
                descripcion: `Temperatura de ${clima.temp_promedio}°C puede causar estrés térmico. Aumenta el riego y considera sombrío temporal para cultivos sensibles.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        // ── Recomendación de cosecha si rendimiento es bueno ──
        if (rend > 0.8 && (riesgo === 'bajo' || riesgo === 'medio')) {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: tipoMap['cosecha'] || 5,
                prioridad: Prioridad.BAJA,
                titulo: '🌾 Planificar cosecha',
                descripcion: `Con un rendimiento predicho de ${rend} ton/ha, planifica con anticipación la logística de cosecha: mano de obra, equipos y transporte.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        // ── Recomendación general siempre ──
        recomendaciones.push({
            prediccion_id: prediccionId,
            tipo_recomendacion_id: tipoMap['general'] || 6,
            prioridad: Prioridad.BAJA,
            titulo: '📊 Registrar actividades en bitácora',
            descripcion: 'Mantén actualizada la bitácora de actividades agrícolas para mejorar la precisión de futuras predicciones del modelo ML.',
            estado_implementacion: EstadoImplementacion.PENDIENTE,
        });

        const guardadas: Recomendacion[] = [];
        for (const r of recomendaciones) {
            const entidad = this.recomendacionRepo.create(r as Recomendacion);
            const saved = await this.recomendacionRepo.save(entidad);
            guardadas.push(saved as Recomendacion);
        }

        return guardadas;
    }
}