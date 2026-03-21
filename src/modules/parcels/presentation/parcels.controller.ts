import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ParcelsService } from '@modules/parcels/application/use-cases/parcels.service';
import {
  CreateParcelaDto,
  UpdateParcelaDto,
  ParcelaResponseDto,
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
  @ApiResponse({ status: 201, description: 'Parcela creada', type: ParcelaResponseDto })
  @ApiResponse({ status: 403, description: 'Solo los agricultores pueden crear parcelas' })
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
  @ApiResponse({ status: 200, description: 'Lista de parcelas del agricultor', type: [ParcelaResponseDto] })
  async findMyParcelas(@CurrentUser() usuario: Usuario): Promise<ParcelaResponseDto[]> {
    return this.parcelsService.findMyParcelas(usuario.usuario_id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TECNICO)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar todas las parcelas (admin: todas, técnico: de sus asignados)' })
  @ApiResponse({ status: 200, description: 'Lista de parcelas', type: [ParcelaResponseDto] })
  async findAll(@CurrentUser() usuario: Usuario): Promise<ParcelaResponseDto[]> {
    return this.parcelsService.findAll(usuario.usuario_id, usuario.rol);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Buscar parcelas cercanas a una coordenada (PostGIS)' })
  @ApiQuery({ name: 'lat', type: Number, example: 5.0689 })
  @ApiQuery({ name: 'lng', type: Number, example: -75.5174 })
  @ApiQuery({ name: 'radio_km', type: Number, example: 10, required: false })
  @ApiResponse({ status: 200, description: 'Parcelas dentro del radio', type: [ParcelaResponseDto] })
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radio_km') radioKm?: number,
  ): Promise<ParcelaResponseDto[]> {
    return this.parcelsService.findNearby(
      Number(lat),
      Number(lng),
      Number(radioKm) || 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener parcela por ID (con verificación de acceso)' })
  @ApiResponse({ status: 200, description: 'Parcela encontrada', type: ParcelaResponseDto })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta parcela' })
  @ApiResponse({ status: 404, description: 'Parcela no encontrada' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ): Promise<ParcelaResponseDto> {
    return this.parcelsService.findOne(id, usuario.usuario_id, usuario.rol);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar parcela (solo propietario o admin)' })
  @ApiResponse({ status: 200, description: 'Parcela actualizada', type: ParcelaResponseDto })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar parcela (solo propietario o admin)' })
  @ApiResponse({ status: 204, description: 'Parcela eliminada' })
  @ApiResponse({ status: 403, description: 'Solo puedes eliminar tus propias parcelas' })
  @ApiResponse({ status: 404, description: 'Parcela no encontrada' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ): Promise<void> {
    return this.parcelsService.remove(id, usuario.usuario_id, usuario.rol);
  }
}
