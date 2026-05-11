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
import { Rol, EstadoImplementacion } from '@common/enums/enums';

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
}