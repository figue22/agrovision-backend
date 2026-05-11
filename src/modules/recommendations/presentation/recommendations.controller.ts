import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { RecommendationsService } from '@modules/recommendations/application/use-cases/recommendations.service';
import { CreateRecomendacionDto } from '@modules/recommendations/application/dto/create-recomendacion.dto';
import { UpdateRecomendacionDto } from '@modules/recommendations/application/dto/update-recomendacion.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Crear recomendación (admin/técnico)' })
  @ApiResponse({ status: 201, description: 'Recomendación creada' })
  async create(@Body() dto: CreateRecomendacionDto) {
    return this.recommendationsService.create(dto);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Todas las recomendaciones (admin/técnico)' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async findAll(@Query('limit') limit?: number) {
    return this.recommendationsService.findAll(limit ? Number(limit) : 50);
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Mis recomendaciones pendientes' })
  async findPendientes(@CurrentUser() usuario: Usuario) {
    return this.recommendationsService.findPendientes(usuario.usuario_id, usuario.rol);
  }

  @Get('prediccion/:prediccionId')
  @ApiOperation({ summary: 'Recomendaciones de una predicción' })
  async findByPrediccion(@Param('prediccionId') prediccionId: string, @CurrentUser() usuario: Usuario) {
    return this.recommendationsService.findByPrediccion(prediccionId, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId')
  @ApiOperation({ summary: 'Recomendaciones de una parcela' })
  async findByParcela(@Param('parcelaId') parcelaId: string, @CurrentUser() usuario: Usuario) {
    return this.recommendationsService.findByParcela(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener recomendación por ID' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.recommendationsService.findOne(id, usuario.usuario_id, usuario.rol);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar recomendación (feedback, estado, calificación)' })
  async update(@Param('id') id: string, @CurrentUser() usuario: Usuario, @Body() dto: UpdateRecomendacionDto) {
    return this.recommendationsService.update(id, usuario.usuario_id, usuario.rol, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar recomendación (solo admin)' })
  async remove(@Param('id') id: string) {
    return this.recommendationsService.remove(id);
  }
}