import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { WeatherService } from '@modules/weather/application/use-cases/weather.service';
import { CreateDatoClimaticoDto } from '@modules/weather/application/dto/create-dato-climatico.dto';
import { UpdateDatoClimaticoDto } from '@modules/weather/application/dto/update-dato-climatico.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Weather')
@Controller('weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Registrar dato climático (admin/técnico)' })
  async create(@Body() dto: CreateDatoClimaticoDto) {
    return this.weatherService.create(dto);
  }

  @Get('parcela/:parcelaId')
  @ApiOperation({ summary: 'Datos climáticos de una parcela' })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  async findByParcela(
    @Param('parcelaId') parcelaId: string,
    @CurrentUser() usuario: Usuario,
    @Query('limit') limit?: number,
  ) {
    return this.weatherService.findByParcela(parcelaId, usuario.usuario_id, usuario.rol, limit ? Number(limit) : 30);
  }

  @Get('parcela/:parcelaId/rango')
  @ApiOperation({ summary: 'Datos climáticos por rango de fechas' })
  @ApiQuery({ name: 'desde', example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', example: '2026-04-30' })
  async findByDateRange(
    @Param('parcelaId') parcelaId: string,
    @Query('desde') desde: string, @Query('hasta') hasta: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.weatherService.findByDateRange(parcelaId, desde, hasta, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId/ultimo')
  @ApiOperation({ summary: 'Último dato climático' })
  async getUltimo(@Param('parcelaId') parcelaId: string, @CurrentUser() usuario: Usuario) {
    return this.weatherService.getUltimo(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId/promedios')
  @ApiOperation({ summary: 'Promedios climáticos en rango' })
  @ApiQuery({ name: 'desde', example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', example: '2026-04-30' })
  async getPromedios(
    @Param('parcelaId') parcelaId: string,
    @Query('desde') desde: string, @Query('hasta') hasta: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.weatherService.getPromedios(parcelaId, desde, hasta, usuario.usuario_id, usuario.rol);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener dato climático por ID' })
  async findOne(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.weatherService.findOne(id, usuario.usuario_id, usuario.rol);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Actualizar dato climático (admin/técnico)' })
  async update(@Param('id') id: string, @CurrentUser() usuario: Usuario, @Body() dto: UpdateDatoClimaticoDto) {
    return this.weatherService.update(id, usuario.usuario_id, usuario.rol, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar dato climático (solo admin)' })
  async remove(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.weatherService.remove(id, usuario.usuario_id, usuario.rol);
  }
}