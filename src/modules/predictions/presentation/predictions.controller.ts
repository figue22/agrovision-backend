import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { PredictionsService } from '@modules/predictions/application/use-cases/predictions.service';
import { CreatePrediccionDto } from '@modules/predictions/application/dto/create-prediccion.dto';
import { UpdatePrediccionDto } from '@modules/predictions/application/dto/update-prediccion.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Predictions')
@Controller('predictions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Registrar predicción (admin/técnico/sistema)' })
  @ApiResponse({ status: 201, description: 'Predicción creada' })
  async create(@Body() dto: CreatePrediccionDto, @CurrentUser() usuario: Usuario) {
    return this.predictionsService.create(dto, usuario.usuario_id, usuario.rol);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Listar todas las predicciones (admin/técnico)' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async findAll(@Query('limit') limit?: number) {
    return this.predictionsService.findAll(limit ? Number(limit) : 50);
  }

  @Get('parcela/:parcelaId')
  @ApiOperation({ summary: 'Predicciones de una parcela' })
  async findByParcela(@Param('parcelaId') parcelaId: string, @CurrentUser() usuario: Usuario) {
    return this.predictionsService.findByParcela(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId/latest')
  @ApiOperation({ summary: 'Última predicción de una parcela' })
  async findLatest(@Param('parcelaId') parcelaId: string, @CurrentUser() usuario: Usuario) {
    return this.predictionsService.findLatestByParcela(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener predicción por ID' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.predictionsService.findOne(id, usuario.usuario_id, usuario.rol);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Actualizar predicción (admin/técnico)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePrediccionDto) {
    return this.predictionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar predicción (solo admin)' })
  async remove(@Param('id') id: string) {
    return this.predictionsService.remove(id);
  }
}