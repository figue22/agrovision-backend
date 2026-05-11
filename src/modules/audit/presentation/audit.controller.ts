import {
  Controller, Get, Param, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from '@modules/audit/application/use-cases/audit.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoría (solo admin)' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiResponse({ status: 200, description: 'Lista de logs' })
  async findAll(@Query('limit') limit?: number) {
    return this.auditService.findAll(limit ? Number(limit) : 100);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Logs por usuario' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async findByUsuario(
    @Param('usuarioId') usuarioId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findByUsuario(usuarioId, limit ? Number(limit) : 50);
  }

  @Get('entidad/:tipoEntidad/:idEntidad')
  @ApiOperation({ summary: 'Logs por entidad específica' })
  async findByEntidad(
    @Param('tipoEntidad') tipoEntidad: string,
    @Param('idEntidad') idEntidad: string,
  ) {
    return this.auditService.findByEntidad(tipoEntidad, idEntidad);
  }

  @Get('rango')
  @ApiOperation({ summary: 'Logs por rango de fechas' })
  @ApiQuery({ name: 'desde', example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', example: '2026-04-30' })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  async findByDateRange(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findByDateRange(desde, hasta, limit ? Number(limit) : 200);
  }
}