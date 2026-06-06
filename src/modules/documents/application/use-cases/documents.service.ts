import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData = require('form-data');
import * as fs from 'fs';

import { Documento } from '@modules/documents/domain/entities/documento.entity';
import { IndiceRagDocumento } from '@modules/documents/domain/entities/indice-rag-documento.entity';
import { CreateDocumentoDto } from '@modules/documents/application/dto/create-documento.dto';
import { UpdateDocumentoDto } from '@modules/documents/application/dto/update-documento.dto';
import { EstadoIndexacion } from '@common/enums/enums';

@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name);
    private readonly ragUrl: string;

    constructor(
        @InjectRepository(Documento)
        private readonly documentoRepo: Repository<Documento>,
        @InjectRepository(IndiceRagDocumento)
        private readonly indiceRagRepo: Repository<IndiceRagDocumento>,
        private readonly configService: ConfigService,
    ) {
        this.ragUrl = this.configService.get<string>('RAG_SERVICE_URL', 'http://localhost:8002');
    }

    async create(usuarioId: string, dto: CreateDocumentoDto): Promise<Documento> {
        const doc = this.documentoRepo.create({
            ...dto,
            subido_por_id: usuarioId,
            estado_indexacion: dto.estado_indexacion || EstadoIndexacion.PENDIENTE,
        });
        return this.documentoRepo.save(doc);
    }

    async uploadAndIndex(
        usuarioId: string,
        file: Express.Multer.File,
        titulo: string,
        categoria: string,
        institucion?: string,
        parcela_id?: string,
        idioma: string = 'es',
    ): Promise<Documento> {
         // 1. Guardar metadata en BD
        const doc = await this.create(usuarioId, {
            titulo,
            categoria,
            ruta_archivo: file.path,
            tipo_archivo: file.mimetype.includes('pdf') ? 'pdf' : 'docx',
            tamano_kb: Math.round(file.size / 1024),
            idioma,
            parcela_id,
            estado_indexacion: EstadoIndexacion.PROCESANDO,
        } as any);

        // 2. Enviar al RAG con el documento_id del backend
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(file.path), file.originalname);
            formData.append('titulo', titulo);
            formData.append('categoria', categoria);
            formData.append('documento_id', doc.documento_id); // ← pasar el ID
            formData.append('subido_por_id', usuarioId);
            if (institucion) formData.append('institucion', institucion);
            if (parcela_id) formData.append('parcela_id', parcela_id);
            formData.append('idioma', idioma);

            const response = await axios.post(
                `${this.ragUrl}/documents/upload`,
                formData,
                { headers: formData.getHeaders(), timeout: 300000 },
            );

            // 3. Actualizar estado con resultado del RAG
            doc.estado_indexacion = EstadoIndexacion.INDEXADO;
            doc.chunks_indexados = response.data.chunks_generados;
            await this.documentoRepo.save(doc);

            this.logger.log(`Documento indexado: ${doc.documento_id} — ${response.data.chunks_generados} chunks`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error indexando documento: ${msg}`);
            doc.estado_indexacion = EstadoIndexacion.FALLIDO;
            await this.documentoRepo.save(doc);
        }

        return this.findOne(doc.documento_id);
    }

    async reindex(documentoId: string): Promise<Documento> {
        const doc = await this.findOne(documentoId);

        if (!doc.ruta_archivo || !fs.existsSync(doc.ruta_archivo)) {
            throw new NotFoundException('Archivo no encontrado en el servidor');
        }

        doc.estado_indexacion = EstadoIndexacion.PROCESANDO;
        await this.documentoRepo.save(doc);

        try {
            const ext = `.${doc.tipo_archivo}`;
            const filename = `${doc.titulo}${ext}`;

            const formData = new FormData();
            formData.append('file', fs.createReadStream(doc.ruta_archivo), {
                filename,
                contentType: doc.tipo_archivo === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            formData.append('titulo', doc.titulo);
            formData.append('categoria', doc.categoria);
            formData.append('documento_id', doc.documento_id);
            if (doc.subido_por_id) formData.append('subido_por_id', doc.subido_por_id);
            if (doc.parcela_id) formData.append('parcela_id', doc.parcela_id);
            formData.append('idioma', doc.idioma || 'es');

            const response = await axios.post(
                `${this.ragUrl}/documents/upload`,
                formData,
                { headers: formData.getHeaders(), timeout: 300000 },
            );

            doc.estado_indexacion = EstadoIndexacion.INDEXADO;
            doc.chunks_indexados = response.data.chunks_generados;
            await this.documentoRepo.save(doc);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error re-indexando: ${msg}`);
            doc.estado_indexacion = EstadoIndexacion.FALLIDO;
            await this.documentoRepo.save(doc);
        }

        return this.findOne(documentoId);
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

        // Eliminar en RAG service
        try {
            await axios.delete(`${this.ragUrl}/documents/${documentoId}`, { timeout: 10000 });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`No se pudo eliminar del RAG: ${msg}`);
        }

        // Eliminar índice RAG primero (FK constraint)
        await this.indiceRagRepo.delete({ documento_id: documentoId });

        // Luego eliminar el documento
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