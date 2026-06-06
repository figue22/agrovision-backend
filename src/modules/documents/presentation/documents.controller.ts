import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiQuery, ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { DocumentsService } from '@modules/documents/application/use-cases/documents.service';
import { CreateDocumentoDto } from '@modules/documents/application/dto/create-documento.dto';
import { UpdateDocumentoDto } from '@modules/documents/application/dto/update-documento.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Post('upload')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Subir e indexar documento PDF/DOCX (admin/técnico)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                titulo: { type: 'string' },
                categoria: { type: 'string' },
                institucion: { type: 'string' },
                parcela_id: { type: 'string' },
                idioma: { type: 'string', default: 'es' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/documents',
            filename: (_req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            const ext = extname(file.originalname).toLowerCase();
            if (['.pdf', '.docx', '.doc'].includes(ext)) {
                cb(null, true);
            } else {
                cb(new Error('Solo se aceptan PDF o DOCX'), false);
            }
        },
        limits: { fileSize: 50 * 1024 * 1024 },
    }))
    async uploadAndIndex(
        @UploadedFile() file: Express.Multer.File,
        @Body('titulo') titulo: string,
        @Body('categoria') categoria: string = 'general',
        @Body('institucion') institucion?: string,
        @Body('parcela_id') parcela_id?: string,
        @Body('idioma') idioma: string = 'es',
        @CurrentUser() usuario?: Usuario,
    ) {
        return this.documentsService.uploadAndIndex(
            usuario?.usuario_id || '',
            file,
            titulo,
            categoria,
            institucion,
            parcela_id,
            idioma,
        );
    }

    @Post(':id/reindex')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Re-indexar documento en ChromaDB (admin/técnico)' })
    async reindex(@Param('id') id: string) {
        return this.documentsService.reindex(id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Crear documento sin archivo (admin/técnico)' })
    async create(@CurrentUser() usuario: Usuario, @Body() dto: CreateDocumentoDto) {
        return this.documentsService.create(usuario.usuario_id, dto);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Listar documentos (admin/técnico)' })
    @ApiQuery({ name: 'limit', required: false, example: 50 })
    async findAll(@Query('limit') limit?: number) {
        return this.documentsService.findAll(limit ? Number(limit) : 50);
    }

    @Get('resumen')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Resumen de documentos' })
    async getResumen() {
        return this.documentsService.getResumen();
    }

    @Get('pendientes')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Documentos pendientes de indexación' })
    async findPendientes() {
        return this.documentsService.findPendientesIndexacion();
    }

    @Get('parcela/:parcelaId')
    @ApiOperation({ summary: 'Documentos de una parcela' })
    async findByParcela(@Param('parcelaId') parcelaId: string) {
        return this.documentsService.findByParcela(parcelaId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener documento por ID' })
    async findOne(@Param('id') id: string) {
        return this.documentsService.findOne(id);
    }

    @Get(':id/indice-rag')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Detalle chunks e índice RAG del documento' })
    async getIndiceRag(@Param('id') id: string) {
        return this.documentsService.getIndiceRag(id);
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Actualizar metadata del documento (admin/técnico)' })
    async update(@Param('id') id: string, @Body() dto: UpdateDocumentoDto) {
        return this.documentsService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar documento y sus chunks (solo admin)' })
    async remove(@Param('id') id: string) {
        return this.documentsService.remove(id);
    }
}