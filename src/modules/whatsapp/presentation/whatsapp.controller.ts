import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { WhatsappService } from '@modules/whatsapp/application/use-cases/whatsapp.service';
import { CreateSesionWaDto } from '@modules/whatsapp/application/dto/create-sesion-wa.dto';
import { UpdateSesionWaDto } from '@modules/whatsapp/application/dto/update-sesion-wa.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TECNICO)
@ApiBearerAuth('access-token')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) { }

  @Post()
  @ApiOperation({ summary: 'Crear sesión WhatsApp' })
  @ApiResponse({ status: 201, description: 'Sesión creada' })
  @ApiResponse({ status: 409, description: 'wa_id duplicado' })
  async create(@Body() dto: CreateSesionWaDto) {
    return this.whatsappService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar sesiones WhatsApp' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async findAll(@Query('limit') limit?: number) {
    return this.whatsappService.findAll(limit ? Number(limit) : 50);
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen de sesiones WhatsApp' })
  async getResumen() {
    return this.whatsappService.getResumen();
  }

  @Get('wa/:waId')
  @ApiOperation({ summary: 'Buscar sesión por número WhatsApp' })
  async findByWaId(@Param('waId') waId: string) {
    return this.whatsappService.findByWaId(waId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener sesión por ID' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(@Param('id') id: string) {
    return this.whatsappService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar sesión WhatsApp' })
  async update(@Param('id') id: string, @Body() dto: UpdateSesionWaDto) {
    return this.whatsappService.update(id, dto);
  }

  @Put('wa/:waId')
  @ApiOperation({ summary: 'Actualizar sesión por número WhatsApp' })
  async updateByWaId(@Param('waId') waId: string, @Body() dto: UpdateSesionWaDto) {
    return this.whatsappService.updateByWaId(waId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar sesión (solo admin)' })
  async remove(@Param('id') id: string) {
    return this.whatsappService.remove(id);
  }
}