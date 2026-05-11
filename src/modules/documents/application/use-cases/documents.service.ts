import {
    Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Documento } from '@modules/documents/domain/entities/documento.entity';
import { IndiceRagDocumento } from '@modules/documents/domain/entities/indice-rag-documento.entity';
import { CreateDocumentoDto } from '@modules/documents/application/dto/create-documento.dto';
import { UpdateDocumentoDto } from '@modules/documents/application/dto/update-documento.dto';
import { EstadoIndexacion } from '@common/enums/enums';

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(Documento)
        private readonly documentoRepo: Repository<Documento>,
        @InjectRepository(IndiceRagDocumento)
        private readonly indiceRagRepo: Repository<IndiceRagDocumento>,
    ) { }

    async create(usuarioId: string, dto: CreateDocumentoDto): Promise<Documento> {
        const doc = this.documentoRepo.create({
            ...dto,
            subido_por_id: usuarioId,
            estado_indexacion: dto.estado_indexacion || EstadoIndexacion.PENDIENTE,
        });
        return this.documentoRepo.save(doc);
    }

    async findAll(limit = 50): Promise<Documento[]> {
        return this.documentoRepo.find({
            relations: ['parcela', 'subidoPor', 'indiceRag'],
            order: { creado_en: 'DESC' },
            take: limit,
        });
    }

    async findByParcela(parcelaId: string): Promise<Documento[]> {
        return this.documentoRepo.find({
            where: { parcela_id: parcelaId, esta_activo: true },
            relations: ['subidoPor', 'indiceRag'],
            order: { creado_en: 'DESC' },
        });
    }

    async findPendientesIndexacion(): Promise<Documento[]> {
        return this.documentoRepo.find({
            where: { estado_indexacion: EstadoIndexacion.PENDIENTE, esta_activo: true },
            order: { creado_en: 'ASC' },
        });
    }

    async findOne(documentoId: string): Promise<Documento> {
        const doc = await this.documentoRepo.findOne({
            where: { documento_id: documentoId },
            relations: ['parcela', 'subidoPor', 'indiceRag'],
        });
        if (!doc) throw new NotFoundException('Documento no encontrado');
        return doc;
    }

    async update(documentoId: string, dto: UpdateDocumentoDto): Promise<Documento> {
        const doc = await this.findOne(documentoId);
        Object.assign(doc, dto);
        return this.documentoRepo.save(doc);
    }

    async remove(documentoId: string): Promise<void> {
        const doc = await this.findOne(documentoId);
        await this.documentoRepo.remove(doc);
    }

    async getIndiceRag(documentoId: string): Promise<IndiceRagDocumento | null> {
        return this.indiceRagRepo.findOne({
            where: { documento_id: documentoId },
            relations: ['documento'],
        });
    }

    async getResumen(): Promise<{
        total: number;
        activos: number;
        pendientes_indexacion: number;
        indexados: number;
        fallidos: number;
    }> {
        const [total, activos, pendientes, indexados, fallidos] = await Promise.all([
            this.documentoRepo.count(),
            this.documentoRepo.count({ where: { esta_activo: true } }),
            this.documentoRepo.count({ where: { estado_indexacion: EstadoIndexacion.PENDIENTE } }),
            this.documentoRepo.count({ where: { estado_indexacion: EstadoIndexacion.INDEXADO } }),
            this.documentoRepo.count({ where: { estado_indexacion: EstadoIndexacion.FALLIDO } }),
        ]);
        return { total, activos, pendientes_indexacion: pendientes, indexados, fallidos };
    }
}