import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { ActivitiesService } from '@modules/activities/application/use-cases/activities.service';
import { CreateActividadDto } from '@modules/activities/application/dto/create-actividad.dto';
import { UpdateActividadDto } from '@modules/activities/application/dto/update-actividad.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) { }

  @Post()
  @ApiOperation({ summary: 'Registrar actividad agrícola' })
  @ApiResponse({ status: 201, description: 'Actividad creada' })
  async create(@CurrentUser() usuario: Usuario, @Body() dto: CreateActividadDto) {
    return this.activitiesService.create(usuario.usuario_id, usuario.rol, dto);
  }

  @Get('parcela/:parcelaId')
  @ApiOperation({ summary: 'Listar actividades de una parcela' })
  @ApiResponse({ status: 200, description: 'Lista de actividades' })
  async findByParcela(@Param('parcelaId') parcelaId: string, @CurrentUser() usuario: Usuario) {
    return this.activitiesService.findByParcela(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId/rango')
  @ApiOperation({ summary: 'Listar actividades por rango de fechas' })
  @ApiQuery({ name: 'desde', example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', example: '2026-04-30' })
  async findByDateRange(
    @Param('parcelaId') parcelaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.activitiesService.findByParcelaAndDateRange(parcelaId, desde, hasta, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId/resumen')
  @ApiOperation({ summary: 'Resumen de actividades de una parcela' })
  async getResumen(@Param('parcelaId') parcelaId: string, @CurrentUser() usuario: Usuario) {
    return this.activitiesService.getResumenParcela(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener actividad por ID' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.activitiesService.findOne(id, usuario.usuario_id, usuario.rol);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar actividad' })
  async update(@Param('id') id: string, @CurrentUser() usuario: Usuario, @Body() dto: UpdateActividadDto) {
    return this.activitiesService.update(id, usuario.usuario_id, usuario.rol, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar actividad' })
  async remove(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.activitiesService.remove(id, usuario.usuario_id, usuario.rol);
  }
}