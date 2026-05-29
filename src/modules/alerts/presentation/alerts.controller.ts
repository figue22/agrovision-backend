import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
} from '@nestjs/swagger';
import { AlertsService } from '@modules/alerts/application/use-cases/alerts.service';
import { CreateAlertaDto } from '@modules/alerts/application/dto/create-alerta.dto';
import { UpdateAlertaDto } from '@modules/alerts/application/dto/update-alerta.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { ClimateAlertService } from '../application/use-cases/climate-alert.service';

@ApiTags('Alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AlertsController {
  constructor(
  private readonly alertsService: AlertsService,
  private readonly climateAlertService: ClimateAlertService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Crear alerta (admin/técnico)' })
  async create(@Body() dto: CreateAlertaDto) {
    return this.alertsService.create(dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mis alertas' })
  async findMyAlerts(@CurrentUser() usuario: Usuario) {
    return this.alertsService.findMyAlerts(usuario.usuario_id);
  }

  @Get('my/unread')
  @ApiOperation({ summary: 'Mis alertas no leídas' })
  async findUnread(@CurrentUser() usuario: Usuario) {
    return this.alertsService.findUnread(usuario.usuario_id);
  }

  @Get('my/unread/count')
  @ApiOperation({ summary: 'Contar alertas no leídas' })
  async countUnread(@CurrentUser() usuario: Usuario) {
    return this.alertsService.countUnread(usuario.usuario_id);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Todas las alertas (admin/técnico)' })
  async findAll() {
    return this.alertsService.findAll();
  }

  @Get('parcela/:parcelaId')
  @ApiOperation({ summary: 'Alertas por parcela' })
  async findByParcela(@Param('parcelaId') parcelaId: string) {
    return this.alertsService.findByParcela(parcelaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener alerta por ID' })
  async findOne(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.alertsService.findOne(id, usuario.usuario_id, usuario.rol);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar alerta como leída' })
  async markAsRead(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.alertsService.markAsRead(id, usuario.usuario_id);
  }

  @Patch('my/read-all')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  async markAllAsRead(@CurrentUser() usuario: Usuario) {
    return this.alertsService.markAllAsRead(usuario.usuario_id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Actualizar alerta (admin/técnico)' })
  async update(@Param('id') id: string, @Body() dto: UpdateAlertaDto) {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar alerta (solo admin)' })
  async remove(@Param('id') id: string) {
    return this.alertsService.remove(id);
  }

  @Patch(':id/unread')
  @ApiOperation({ summary: 'Marcar alerta como no leída' })
  async markAsUnread(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ): Promise<Alerta> {
    return this.alertsService.markAsUnread(id, usuario.usuario_id);
  }

  @Post('system')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear notificación del sistema para todos los usuarios (solo admin)' })
  async createSystemNotification(
    @Body() dto: { titulo: string; mensaje: string; usuario_ids?: string[] },
  ) {
    const creadas = await this.climateAlertService.crearNotificacionSistema(
      dto.titulo,
      dto.mensaje,
      dto.usuario_ids,
    );
    return { notificaciones_creadas: creadas };
  }

  
}