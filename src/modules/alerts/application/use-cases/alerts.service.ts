import {
    Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { CreateAlertaDto } from '@modules/alerts/application/dto/create-alerta.dto';
import { UpdateAlertaDto } from '@modules/alerts/application/dto/update-alerta.dto';
import { Rol } from '@common/enums/enums';

@Injectable()
export class AlertsService {
    constructor(
        @InjectRepository(Alerta)
        private readonly alertaRepo: Repository<Alerta>,
    ) { }

    async create(dto: CreateAlertaDto): Promise<Alerta> {
        const alerta = this.alertaRepo.create(dto);
        return this.alertaRepo.save(alerta);
    }

    async findMyAlerts(usuarioId: string): Promise<Alerta[]> {
        return this.alertaRepo.find({
            where: { usuario_id: usuarioId },
            relations: ['tipoAlerta', 'parcela'],
            order: { creado_en: 'DESC' },
        });
    }

    async findUnread(usuarioId: string): Promise<Alerta[]> {
        return this.alertaRepo.find({
            where: { usuario_id: usuarioId, esta_leida: false },
            relations: ['tipoAlerta', 'parcela'],
            order: { creado_en: 'DESC' },
        });
    }

    async countUnread(usuarioId: string): Promise<{ count: number }> {
        const count = await this.alertaRepo.count({
            where: { usuario_id: usuarioId, esta_leida: false },
        });
        return { count };
    }

    async findAll(): Promise<Alerta[]> {
        return this.alertaRepo.find({
            relations: ['tipoAlerta', 'parcela', 'usuario'],
            order: { creado_en: 'DESC' },
            take: 100,
        });
    }

    async findByParcela(parcelaId: string): Promise<Alerta[]> {
        return this.alertaRepo.find({
            where: { parcela_id: parcelaId },
            relations: ['tipoAlerta'],
            order: { creado_en: 'DESC' },
        });
    }

    async findOne(alertaId: string, usuarioId: string, rol: string): Promise<Alerta> {
        const alerta = await this.alertaRepo.findOne({
            where: { alerta_id: alertaId },
            relations: ['tipoAlerta', 'parcela', 'usuario'],
        });
        if (!alerta) throw new NotFoundException('Alerta no encontrada');
        if (rol === Rol.AGRICULTOR && alerta.usuario_id !== usuarioId) {
            throw new ForbiddenException('No tienes acceso a esta alerta');
        }
        return alerta;
    }

    async markAsRead(alertaId: string, usuarioId: string): Promise<Alerta> {
        const alerta = await this.alertaRepo.findOne({
            where: { alerta_id: alertaId, usuario_id: usuarioId },
        });
        if (!alerta) throw new NotFoundException('Alerta no encontrada');
        alerta.esta_leida = true;
        alerta.fecha_lectura = new Date();
        return this.alertaRepo.save(alerta);
    }

    async markAllAsRead(usuarioId: string): Promise<{ updated: number }> {
        const result = await this.alertaRepo.update(
            { usuario_id: usuarioId, esta_leida: false },
            { esta_leida: true, fecha_lectura: new Date() },
        );
        return { updated: result.affected || 0 };
    }

    async update(alertaId: string, dto: UpdateAlertaDto): Promise<Alerta> {
        const alerta = await this.alertaRepo.findOne({ where: { alerta_id: alertaId } });
        if (!alerta) throw new NotFoundException('Alerta no encontrada');
        Object.assign(alerta, dto);
        return this.alertaRepo.save(alerta);
    }

    async remove(alertaId: string): Promise<void> {
        const alerta = await this.alertaRepo.findOne({ where: { alerta_id: alertaId } });
        if (!alerta) throw new NotFoundException('Alerta no encontrada');
        await this.alertaRepo.remove(alerta);
    }

    async markAsUnread(alertaId: string, usuarioId: string): Promise<Alerta> {
        const alerta = await this.alertaRepo.findOne({
            where: { alerta_id: alertaId, usuario_id: usuarioId },
        });
        if (!alerta) throw new NotFoundException('Alerta no encontrada');
        alerta.esta_leida = false;
        alerta.fecha_lectura = undefined as unknown as Date;
        return this.alertaRepo.save(alerta);
    }
}