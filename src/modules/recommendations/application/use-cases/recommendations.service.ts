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

@Injectable()
export class RecommendationsService {
    constructor(
        @InjectRepository(Recomendacion)
        private readonly recomendacionRepo: Repository<Recomendacion>,
        @InjectRepository(Prediccion)
        private readonly prediccionRepo: Repository<Prediccion>,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
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

        // Eliminar recomendaciones previas de esta predicción
        await this.recomendacionRepo.delete({ prediccion_id: prediccionId });

        const recomendaciones: Partial<Recomendacion>[] = [];
        const rend = Number(prediccion.rendimiento_predicho_ton);
        const riesgo = prediccion.nivel_riesgo;

        // ── Recomendaciones por nivel de riesgo ──
        if (riesgo === 'critico' || riesgo === 'alto') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: 1,
                prioridad: Prioridad.URGENTE,
                titulo: '🚨 Revisión urgente del cultivo requerida',
                descripcion: `El modelo predice un rendimiento de ${rend} ton/ha con nivel de riesgo ${riesgo}. Se recomienda inspección inmediata del cultivo para identificar causas y tomar acciones correctivas.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (riesgo === 'alto' || riesgo === 'critico') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: 2,
                prioridad: Prioridad.ALTA,
                titulo: '💧 Optimizar sistema de riego',
                descripcion: 'Las condiciones climáticas y el rendimiento predicho sugieren déficit hídrico. Evalúa aumentar la frecuencia de riego y verifica la eficiencia del sistema de distribución de agua.',
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });

            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: 3,
                prioridad: Prioridad.ALTA,
                titulo: '🧪 Plan de fertilización intensivo',
                descripcion: 'Para mejorar el rendimiento predicho, implementa un plan de fertilización completo con análisis de suelo previo. Prioriza nitrógeno, fósforo y potasio según deficiencias identificadas.',
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (riesgo === 'medio') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: 2,
                prioridad: Prioridad.MEDIA,
                titulo: '🌱 Ajuste de prácticas agrícolas',
                descripcion: `Rendimiento predicho de ${rend} ton/ha. Para mejorar, considera optimizar la densidad de siembra, ajustar el calendario de fertilización y reforzar el control de plagas y enfermedades.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        if (riesgo === 'bajo') {
            recomendaciones.push({
                prediccion_id: prediccionId,
                tipo_recomendacion_id: 4,
                prioridad: Prioridad.BAJA,
                titulo: '✅ Mantener prácticas actuales',
                descripcion: `Excelente predicción de ${rend} ton/ha. Las condiciones actuales son óptimas. Mantén las prácticas agrícolas actuales y realiza monitoreo periódico para sostener el rendimiento.`,
                estado_implementacion: EstadoImplementacion.PENDIENTE,
            });
        }

        // ── Recomendación general siempre ──
        recomendaciones.push({
            prediccion_id: prediccionId,
            tipo_recomendacion_id: 5,
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