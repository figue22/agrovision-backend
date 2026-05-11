import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
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
  constructor(private readonly documentsService: DocumentsService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Subir documento (admin/técnico)' })
  @ApiResponse({ status: 201, description: 'Documento creado' })
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
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/indice-rag')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Obtener índice RAG del documento' })
  async getIndiceRag(@Param('id') id: string) {
    return this.documentsService.getIndiceRag(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Actualizar documento (admin/técnico)' })
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentoDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar documento (solo admin)' })
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}