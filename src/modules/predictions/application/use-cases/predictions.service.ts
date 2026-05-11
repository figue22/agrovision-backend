import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CreatePrediccionDto } from '@modules/predictions/application/dto/create-prediccion.dto';
import { UpdatePrediccionDto } from '@modules/predictions/application/dto/update-prediccion.dto';
import { Rol } from '@common/enums/enums';

@Injectable()
export class PredictionsService {
    constructor(
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

    async create(dto: CreatePrediccionDto): Promise<Prediccion> {
        const parcela = await this.parcelaRepo.findOne({ where: { parcela_id: dto.parcela_id } });
        if (!parcela) throw new NotFoundException('Parcela no encontrada');
        const prediccion = this.prediccionRepo.create(dto);
        return this.prediccionRepo.save(prediccion);
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
        const prediccion = await this.prediccionRepo.findOne({ where: { prediccion_id: prediccionId } });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        Object.assign(prediccion, dto);
        return this.prediccionRepo.save(prediccion);
    }

    async remove(prediccionId: string): Promise<void> {
        const prediccion = await this.prediccionRepo.findOne({ where: { prediccion_id: prediccionId } });
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