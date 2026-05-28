import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { ParcelsService } from '@modules/parcels/application/use-cases/parcels.service';
import {
  CreateParcelaDto, UpdateParcelaDto, ParcelaResponseDto,
} from '@modules/parcels/application/dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Parcels')
@Controller('parcels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  @Roles(Role.AGRICULTOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Crear nueva parcela (solo agricultor)' })
  @ApiResponse({ status: 201, type: ParcelaResponseDto })
  async create(
    @CurrentUser() usuario: Usuario,
    @Body() dto: CreateParcelaDto,
  ): Promise<ParcelaResponseDto> {
    return this.parcelsService.create(usuario.usuario_id, dto);
  }

  @Get('my')
  @Roles(Role.AGRICULTOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar mis parcelas (solo agricultor)' })
  async findMyParcelas(@CurrentUser() usuario: Usuario): Promise<ParcelaResponseDto[]> {
    return this.parcelsService.findMyParcelas(usuario.usuario_id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TECNICO)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar todas las parcelas (admin/técnico)' })
  async findAll(@CurrentUser() usuario: Usuario): Promise<ParcelaResponseDto[]> {
    return this.parcelsService.findAll(usuario.usuario_id, usuario.rol);
  }

  @Get('nearby')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Buscar parcelas cercanas (PostGIS) — solo admin/técnico' })
  @ApiQuery({ name: 'lat', type: Number, example: 5.0689 })
  @ApiQuery({ name: 'lng', type: Number, example: -75.5174 })
  @ApiQuery({ name: 'radio_km', type: Number, example: 10, required: false })
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radio_km') radioKm?: number,
  ): Promise<ParcelaResponseDto[]> {
    return this.parcelsService.findNearby(Number(lat), Number(lng), Number(radioKm) || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener parcela por ID (con verificación de acceso)' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta parcela' })
  @ApiResponse({ status: 404, description: 'Parcela no encontrada' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ): Promise<ParcelaResponseDto> {
    return this.parcelsService.findOne(id, usuario.usuario_id, usuario.rol);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.AGRICULTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar parcela (agricultor propietario o admin)' })
  @ApiResponse({ status: 403, description: 'Solo puedes modificar tus propias parcelas' })
  @ApiResponse({ status: 404, description: 'Parcela no encontrada' })
  async update(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
    @Body() dto: UpdateParcelaDto,
  ): Promise<ParcelaResponseDto> {
    return this.parcelsService.update(id, dto, usuario.usuario_id, usuario.rol);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.AGRICULTOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar parcela (agricultor propietario o admin)' })
  @ApiResponse({ status: 403, description: 'Solo puedes eliminar tus propias parcelas' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ): Promise<void> {
    return this.parcelsService.remove(id, usuario.usuario_id, usuario.rol);
  }
}