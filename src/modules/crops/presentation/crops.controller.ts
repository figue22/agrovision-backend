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
import { CropsService } from '@modules/crops/application/use-cases/crops.service';
import {
  CreateTipoCultivoDto,
  UpdateTipoCultivoDto,
  CreateCultivoParcelaDto,
  UpdateCultivoParcelaDto,
} from '@modules/crops/application/dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Crops')
@Controller('crops')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  // ══════════════════════════════════════════
  // TIPOS DE CULTIVO (catálogo maestro)
  // ══════════════════════════════════════════

  @Get('tipos')
  @ApiOperation({ summary: 'Listar todos los tipos de cultivo (cualquier usuario autenticado)' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de cultivo' })
  async findAllTipos() {
    return this.cropsService.findAll();
  }

  @Get('tipos/categoria')
  @ApiOperation({ summary: 'Buscar tipos de cultivo por categoría' })
  @ApiQuery({ name: 'cat', type: String, example: 'fruta' })
  @ApiResponse({ status: 200, description: 'Tipos de cultivo de la categoría' })
  async findByCategoria(@Query('cat') categoria: string) {
    return this.cropsService.findByCategoria(categoria);
  }

  @Get('tipos/:id')
  @ApiOperation({ summary: 'Obtener tipo de cultivo por ID' })
  @ApiResponse({ status: 200, description: 'Tipo de cultivo encontrado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async findOneTipo(@Param('id') id: string) {
    return this.cropsService.findById(id);
  }

  @Post('tipos')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear tipo de cultivo (solo admin)' })
  @ApiResponse({ status: 201, description: 'Tipo de cultivo creado' })
  @ApiResponse({ status: 409, description: 'Ya existe un tipo con ese nombre' })
  async createTipo(@Body() dto: CreateTipoCultivoDto) {
    return this.cropsService.create(dto);
  }

  @Put('tipos/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar tipo de cultivo (solo admin)' })
  @ApiResponse({ status: 200, description: 'Tipo de cultivo actualizado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado o validación fallida' })
  async updateTipo(@Param('id') id: string, @Body() dto: UpdateTipoCultivoDto) {
    return this.cropsService.update(id, dto);
  }

  @Delete('tipos/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar tipo de cultivo (solo admin)' })
  @ApiResponse({ status: 204, description: 'Tipo de cultivo eliminado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async removeTipo(@Param('id') id: string) {
    return this.cropsService.remove(id);
  }


// ══════════════════════════════════════════
  // CULTIVOS POR PARCELA
  // ══════════════════════════════════════════

  @Post('parcela')
  @Roles(Role.AGRICULTOR, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Registrar cultivo en una parcela (agricultor/admin)' })
  @ApiResponse({ status: 201, description: 'Cultivo registrado' })
  @ApiResponse({ status: 400, description: 'Validación fallida (fechas, área)' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta parcela' })
  @ApiResponse({ status: 404, description: 'Parcela o tipo de cultivo no encontrado' })
  async createCultivoParcela(
    @Body() dto: CreateCultivoParcelaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.cropsService.createCultivoParcela(dto, usuario.usuario_id, usuario.rol);
  }

  @Get('all')
  @Roles(Role.ADMIN, Role.TECNICO)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar todos los cultivos (admin: todos, técnico: de asignados)' })
  async findAllCultivos(@CurrentUser() usuario: Usuario) {
    return this.cropsService.findAllCultivos(usuario.usuario_id, usuario.rol);
  }

  @Get('my')
  @Roles(Role.AGRICULTOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar todos mis cultivos (agricultor)' })
  @ApiResponse({ status: 200, description: 'Lista de cultivos del agricultor' })
  async findMyCultivos(@CurrentUser() usuario: Usuario) {
    return this.cropsService.findMyCultivos(usuario.usuario_id);
  }

  @Get('parcela/:parcelaId')
  @ApiOperation({ summary: 'Listar cultivos de una parcela (con verificación de acceso)' })
  @ApiResponse({ status: 200, description: 'Cultivos de la parcela' })
  @ApiResponse({ status: 403, description: 'No tienes acceso' })
  @ApiResponse({ status: 404, description: 'Parcela no encontrada' })
  async findCultivosByParcela(
    @Param('parcelaId') parcelaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.cropsService.findCultivosByParcela(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/cultivo/:id')
  @ApiOperation({ summary: 'Obtener cultivo por ID' })
  @ApiResponse({ status: 403, description: 'No tienes acceso' })
  @ApiResponse({ status: 404, description: 'Cultivo no encontrado' })
  async findCultivoById(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.cropsService.findCultivoById(id, usuario.usuario_id, usuario.rol);
  }

  @Put('parcela/cultivo/:id')
  @Roles(Role.AGRICULTOR, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Actualizar cultivo (propietario/admin)' })
  @ApiResponse({ status: 200, description: 'Cultivo actualizado' })
  @ApiResponse({ status: 400, description: 'Validación fallida' })
  @ApiResponse({ status: 403, description: 'Solo puedes modificar tus cultivos' })
  async updateCultivoParcela(
    @Param('id') id: string,
    @Body() dto: UpdateCultivoParcelaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.cropsService.updateCultivoParcela(id, dto, usuario.usuario_id, usuario.rol);
  }

  @Delete('parcela/cultivo/:id')
  @Roles(Role.AGRICULTOR, Role.ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cultivo (propietario/admin)' })
  @ApiResponse({ status: 204, description: 'Cultivo eliminado' })
  @ApiResponse({ status: 403, description: 'Solo puedes eliminar tus cultivos' })
  async removeCultivoParcela(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.cropsService.removeCultivoParcela(id, usuario.usuario_id, usuario.rol);
  }
}
