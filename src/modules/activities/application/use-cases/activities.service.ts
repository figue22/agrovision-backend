import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { Actividad } from '@modules/activities/domain/entities/actividad.entity';
import { InsumoActividad } from '@modules/activities/domain/entities/insumo-actividad.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CreateActividadDto } from '@modules/activities/application/dto/create-actividad.dto';
import { UpdateActividadDto } from '@modules/activities/application/dto/update-actividad.dto';
import { Rol } from '@common/enums/enums';

@Injectable()
export class ActivitiesService {
    constructor(
        @InjectRepository(Actividad)
        private readonly actividadRepo: Repository<Actividad>,
        @InjectRepository(InsumoActividad)
        private readonly insumoRepo: Repository<InsumoActividad>,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
    ) { }

    private async verificarAccesoParcela(
        parcelaId: string,
        usuarioId: string,
        rol: string,
    ): Promise<Parcela> {
        const parcela = await this.parcelaRepo.findOne({
            where: { parcela_id: parcelaId },
            relations: ['agricultor'],
        });

        if (!parcela) {
            throw new NotFoundException('Parcela no encontrada');
        }

        if (rol === Rol.AGRICULTOR && parcela.agricultor?.usuario_id !== usuarioId) {
            throw new ForbiddenException('No tienes acceso a esta parcela');
        }

        return parcela;
    }

    async create(usuarioId: string, rol: string, dto: CreateActividadDto): Promise<Actividad> {
        await this.verificarAccesoParcela(dto.parcela_id, usuarioId, rol);

        const actividad = this.actividadRepo.create({
            ...dto,
            realizada_por_id: usuarioId,
            insumos: dto.insumos?.map((insumo) => this.insumoRepo.create(insumo)),
        });

        return this.actividadRepo.save(actividad);
    }

    async findByParcela(parcelaId: string, usuarioId: string, rol: string): Promise<Actividad[]> {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);

        return this.actividadRepo.find({
            where: { parcela_id: parcelaId },
            relations: ['tipoActividad', 'insumos', 'insumos.tipoInsumo', 'realizadaPor'],
            order: { fecha_realizacion: 'DESC' },
        });
    }

    async findByParcelaAndDateRange(
        parcelaId: string, fechaInicio: string, fechaFin: string, usuarioId: string, rol: string,
    ): Promise<Actividad[]> {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);

        return this.actividadRepo.find({
            where: {
                parcela_id: parcelaId,
                fecha_realizacion: Between(new Date(fechaInicio), new Date(fechaFin)),
            },
            relations: ['tipoActividad', 'insumos', 'insumos.tipoInsumo'],
            order: { fecha_realizacion: 'DESC' },
        });
    }

    async findOne(actividadId: string, usuarioId: string, rol: string): Promise<Actividad> {
        const actividad = await this.actividadRepo.findOne({
            where: { actividad_id: actividadId },
            relations: ['tipoActividad', 'insumos', 'insumos.tipoInsumo', 'realizadaPor', 'parcela'],
        });

        if (!actividad) {
            throw new NotFoundException('Actividad no encontrada');
        }

        await this.verificarAccesoParcela(actividad.parcela_id, usuarioId, rol);
        return actividad;
    }

    async update(actividadId: string, usuarioId: string, rol: string, dto: UpdateActividadDto): Promise<Actividad> {
        const actividad = await this.findOne(actividadId, usuarioId, rol);

        if (dto.insumos) {
            await this.insumoRepo.delete({ actividad_id: actividadId });
            actividad.insumos = dto.insumos.map((insumo) =>
                this.insumoRepo.create({ ...insumo, actividad_id: actividadId }),
            );
        }

        Object.assign(actividad, { ...dto, insumos: actividad.insumos });
        return this.actividadRepo.save(actividad);
    }

    async remove(actividadId: string, usuarioId: string, rol: string): Promise<void> {
        const actividad = await this.findOne(actividadId, usuarioId, rol);
        await this.actividadRepo.remove(actividad);
    }

    async getResumenParcela(parcelaId: string, usuarioId: string, rol: string) {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);

        const actividades = await this.actividadRepo.find({
            where: { parcela_id: parcelaId },
            relations: ['tipoActividad'],
        });

        const costoTotal = actividades.reduce((sum, a) => sum + (Number(a.costo_cop) || 0), 0);

        const porTipo = actividades.reduce((acc, a) => {
            const tipo = a.tipoActividad?.nombre || 'Sin tipo';
            const existing = acc.find((x) => x.tipo === tipo);
            if (existing) existing.cantidad++;
            else acc.push({ tipo, cantidad: 1 });
            return acc;
        }, [] as { tipo: string; cantidad: number }[]);

        return { total_actividades: actividades.length, costo_total_cop: costoTotal, por_tipo: porTipo };
    }
}