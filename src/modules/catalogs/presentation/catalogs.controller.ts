import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CatalogsService } from '@modules/catalogs/application/use-cases/catalogs.service';
import { CreateCatalogDto } from '@modules/catalogs/application/dto/create-catalog.dto';
import { UpdateCatalogDto } from '@modules/catalogs/application/dto/update-catalog.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';

const CATALOG_TYPES = ['tipos-actividad', 'tipos-alerta', 'tipos-recomendacion', 'tipos-insumo'];

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  // ── LECTURA — Cualquier usuario autenticado ──

  @Get('resumen')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Resumen de cantidad de items por catálogo' })
  @ApiResponse({ status: 200, description: 'Resumen de catálogos' })
  async getResumen() {
    return this.catalogsService.getResumen();
  }

  @Get(':tipo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar todos los items de un catálogo' })
  @ApiParam({ name: 'tipo', enum: CATALOG_TYPES })
  @ApiResponse({ status: 200, description: 'Lista de items del catálogo' })
  async findAll(@Param('tipo') tipo: string) {
    return this.catalogsService.findAll(tipo);
  }

  @Get(':tipo/activos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar solo items activos de un catálogo' })
  @ApiParam({ name: 'tipo', enum: CATALOG_TYPES })
  @ApiResponse({ status: 200, description: 'Lista de items activos' })
  async findActivos(@Param('tipo') tipo: string) {
    return this.catalogsService.findActivos(tipo);
  }

  @Get(':tipo/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener un item de catálogo por ID' })
  @ApiParam({ name: 'tipo', enum: CATALOG_TYPES })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Item encontrado' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  async findOne(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.catalogsService.findOne(tipo, id);
  }

  // ── ESCRITURA — Solo admin ──

  @Post(':tipo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Crear item de catálogo (solo admin)' })
  @ApiParam({ name: 'tipo', enum: CATALOG_TYPES })
  @ApiResponse({ status: 201, description: 'Item creado' })
  @ApiResponse({ status: 409, description: 'Código duplicado' })
  async create(
    @Param('tipo') tipo: string,
    @Body() dto: CreateCatalogDto,
  ) {
    return this.catalogsService.create(tipo, dto);
  }

  @Put(':tipo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar item de catálogo (solo admin)' })
  @ApiParam({ name: 'tipo', enum: CATALOG_TYPES })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Item actualizado' })
  async update(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogDto,
  ) {
    return this.catalogsService.update(tipo, id, dto);
  }

  @Delete(':tipo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar item de catálogo (solo admin)' })
  @ApiParam({ name: 'tipo', enum: CATALOG_TYPES })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Item eliminado' })
  async remove(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.catalogsService.remove(tipo, id);
  }

  @Patch(':tipo/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Activar/desactivar item de catálogo (solo admin)' })
  @ApiParam({ name: 'tipo', enum: CATALOG_TYPES })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Estado cambiado' })
  async toggleActivo(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.catalogsService.toggleActivo(tipo, id);
  }
}