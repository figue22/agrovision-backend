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
import { CreateTipoCultivoDto, UpdateTipoCultivoDto } from '@modules/crops/application/dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';

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
}
