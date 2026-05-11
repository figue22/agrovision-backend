import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { LogAuditoria } from '@modules/audit/domain/entities/log-auditoria.entity';
import { CreateLogDto } from '@modules/audit/application/dto/create-log.dto';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(LogAuditoria)
        private readonly logRepo: Repository<LogAuditoria>,
    ) { }

    async log(dto: CreateLogDto): Promise<LogAuditoria> {
        const log = this.logRepo.create(dto);
        return this.logRepo.save(log);
    }

    async findAll(limit = 100): Promise<LogAuditoria[]> {
        return this.logRepo.find({
            relations: ['usuario'],
            order: { creado_en: 'DESC' },
            take: limit,
        });
    }

    async findByUsuario(usuarioId: string, limit = 50): Promise<LogAuditoria[]> {
        return this.logRepo.find({
            where: { usuario_id: usuarioId },
            order: { creado_en: 'DESC' },
            take: limit,
        });
    }

    async findByEntidad(tipoEntidad: string, idEntidad: string): Promise<LogAuditoria[]> {
        return this.logRepo.find({
            where: { tipo_entidad: tipoEntidad, id_entidad: idEntidad },
            relations: ['usuario'],
            order: { creado_en: 'DESC' },
        });
    }

    async findByDateRange(fechaInicio: string, fechaFin: string, limit = 200): Promise<LogAuditoria[]> {
        return this.logRepo.find({
            where: {
                creado_en: Between(new Date(fechaInicio), new Date(fechaFin)),
            },
            relations: ['usuario'],
            order: { creado_en: 'DESC' },
            take: limit,
        });
    }
}