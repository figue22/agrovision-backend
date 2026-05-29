import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { WeatherService } from '@modules/weather/application/use-cases/weather.service';
import { OpenWeatherMapService } from '@modules/weather/application/use-cases/openweathermap.service';
import { IdeamService } from '@modules/weather/application/use-cases/ideam.service';
import { CreateDatoClimaticoDto } from '@modules/weather/application/dto/create-dato-climatico.dto';
import { UpdateDatoClimaticoDto } from '@modules/weather/application/dto/update-dato-climatico.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { WeatherSchedulerService } from '@modules/weather/application/use-cases/weather-scheduler.service';
import { ClimateAlertService } from '@modules/alerts/application/use-cases/climate-alert.service';

@ApiTags('Weather')
@Controller('weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly owmService: OpenWeatherMapService,
    private readonly ideamService: IdeamService,
    private readonly schedulerService: WeatherSchedulerService,
    private readonly climateAlertService: ClimateAlertService,
  ) {}

  // ── OpenWeatherMap Integration ──

  @Get('parcela/:parcelaId/fetch')
  @ApiOperation({ summary: 'Obtener clima actual de OpenWeatherMap (cache 6h)' })
  async fetchCurrent(
    @Param('parcelaId') parcelaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    await this.weatherService.verificarAcceso(parcelaId, usuario.usuario_id, usuario.rol);
    return this.owmService.fetchCurrentWeather(parcelaId);
  }

  @Get('parcela/:parcelaId/forecast')
  @ApiOperation({ summary: 'Obtener pronóstico 5 días de OpenWeatherMap (cache 6h)' })
  async fetchForecast(
    @Param('parcelaId') parcelaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    await this.weatherService.verificarAcceso(parcelaId, usuario.usuario_id, usuario.rol);
    return this.owmService.fetchForecast(parcelaId);
  }

  @Post('fetch-all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Actualizar clima de todas las parcelas (admin/técnico)' })
  async fetchAllParcelas() {
    return this.owmService.fetchAllParcelas();
  }

  @Get('parcela/:parcelaId/ideam')
  @ApiOperation({ summary: 'Obtener datos históricos IDEAM (estación más cercana, cache 24h)' })
  @ApiQuery({ name: 'desde', example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', example: '2026-04-30' })
  async fetchIdeam(
    @Param('parcelaId') parcelaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @CurrentUser() usuario: Usuario,
  ) {
    await this.weatherService.verificarAcceso(parcelaId, usuario.usuario_id, usuario.rol);
    return this.ideamService.fetchHistorico(parcelaId, desde, hasta);
  }

  // ── CRUD Existente ──

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Registrar dato climático manual (admin/técnico)' })
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
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.weatherService.findByDateRange(parcelaId, desde, hasta, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId/ultimo')
  @ApiOperation({ summary: 'Último dato climático' })
  async getUltimo(
    @Param('parcelaId') parcelaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.weatherService.getUltimo(parcelaId, usuario.usuario_id, usuario.rol);
  }

  @Get('parcela/:parcelaId/promedios')
  @ApiOperation({ summary: 'Promedios climáticos en rango' })
  @ApiQuery({ name: 'desde', example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', example: '2026-04-30' })
  async getPromedios(
    @Param('parcelaId') parcelaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
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
  async update(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
    @Body() dto: UpdateDatoClimaticoDto,
  ) {
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

  // ── Job Admin endpoints ──

  @Post('jobs/trigger')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Disparar manualmente el job de recolección de clima (solo admin)' })
  async triggerWeatherJob() {
    const job = await this.schedulerService.triggerFetchAll();
    return { mensaje: 'Job iniciado', job_id: job.id };
  }

  @Post('jobs/trigger/:parcelaId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Disparar job para una parcela específica (admin/técnico)' })
  async triggerWeatherJobOne(@Param('parcelaId') parcelaId: string) {
    const job = await this.schedulerService.triggerFetchOne(parcelaId);
    return { mensaje: 'Job iniciado', job_id: job.id };
  }

 @Get('jobs/stats')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@ApiOperation({ summary: 'Estado del queue de clima (solo admin)' })
@ApiQuery({ name: 'completadosPage', required: false })
@ApiQuery({ name: 'fallidosPage', required: false })
@ApiQuery({ name: 'activosPage', required: false })
@ApiQuery({ name: 'pageSize', required: false })
async getJobStats(
  @Query('completadosPage') completadosPage?: number,
  @Query('fallidosPage') fallidosPage?: number,
  @Query('activosPage') activosPage?: number,
  @Query('pageSize') pageSize?: number,
) {
  return this.schedulerService.getQueueStats(
    Number(completadosPage) || 0,
    Number(fallidosPage) || 0,
    Number(activosPage) || 0,
    Number(pageSize) || 5,
    );
  }

  @Post('jobs/retry-failed')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reintentar jobs fallidos (solo admin)' })
  async retryFailedJobs() {
    return this.schedulerService.retryFailedJobs();
  }

  @Post('alerts/evaluate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Evaluar alertas climáticas manualmente (admin/técnico)' })
  async evaluateAlerts() {
    return this.climateAlertService.evaluarTodasLasParcelas();
  }

  @Post('alerts/evaluate/:parcelaId')
  @ApiOperation({ summary: 'Evaluar alertas para una parcela específica' })
  async evaluateAlertsForParcela(
    @Param('parcelaId') parcelaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    await this.weatherService.verificarAcceso(parcelaId, usuario.usuario_id, usuario.rol);
    const alertas = await this.climateAlertService.evaluarParcela(parcelaId);
    return { alertas_generadas: alertas };
  }

  @Post('alerts/reminders')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Evaluar recordatorios de cosecha próxima (admin/técnico)' })
  async evaluateReminders() {
    const creadas = await this.climateAlertService.evaluarRecordatorios();
    return { recordatorios_generados: creadas };
  }
}