import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from '@modules/admin/application/use-cases/admin.service';
import { ChangeRoleDto } from '@modules/admin/application/dto/change-role.dto';
import { ToggleUserStatusDto } from '@modules/admin/application/dto/toggle-user-status.dto';
import { CreateUserDto } from '@modules/admin/application/dto/create-user.dto';
import {
  AsignarAgricultorDto,
  DesasignarAgricultorDto,
} from '@modules/admin/application/dto/asignar-agricultor.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ══════════════════════════════════════════
  // GESTIÓN DE USUARIOS
  // ══════════════════════════════════════════

  @Get('users')
  @ApiOperation({ summary: 'Listar todos los usuarios (solo admin)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/stats')
  @ApiOperation({ summary: 'Estadísticas de usuarios por rol (solo admin)' })
  @ApiResponse({ status: 200, description: 'Conteo de usuarios por rol' })
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Obtener usuario por ID (solo admin)' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findUser(@Param('id') id: string) {
    return this.adminService.findUserById(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Crear usuario con rol específico (solo admin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'El correo ya existe' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Put('users/role')
  @ApiOperation({ summary: 'Cambiar rol de un usuario (solo admin)' })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  @ApiResponse({ status: 400, description: 'No puedes cambiar tu propio rol' })
  async changeRole(
    @Body() dto: ChangeRoleDto,
    @CurrentUser() admin: Usuario,
  ) {
    return this.adminService.changeRole(dto, admin.usuario_id);
  }

  @Put('users/status')
  @ApiOperation({ summary: 'Activar/desactivar un usuario (solo admin)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 400, description: 'No puedes desactivar tu propia cuenta' })
  async toggleStatus(
    @Body() dto: ToggleUserStatusDto,
    @CurrentUser() admin: Usuario,
  ) {
    return this.adminService.toggleUserStatus(dto, admin.usuario_id);
  }

  // ══════════════════════════════════════════
  // ASIGNACIONES TÉCNICO ↔ AGRICULTOR
  // ══════════════════════════════════════════

  @Post('assignments')
  @ApiOperation({ summary: 'Asignar agricultor a técnico (solo admin)' })
  @ApiResponse({ status: 201, description: 'Asignación creada' })
  @ApiResponse({ status: 400, description: 'El usuario no tiene rol de técnico' })
  @ApiResponse({ status: 409, description: 'El agricultor ya está asignado a este técnico' })
  async asignarAgricultor(@Body() dto: AsignarAgricultorDto) {
    return this.adminService.asignarAgricultor(dto);
  }

  @Delete('assignments')
  @ApiOperation({ summary: 'Desasignar agricultor de técnico (solo admin)' })
  @ApiResponse({ status: 200, description: 'Asignación desactivada' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  async desasignarAgricultor(@Body() dto: DesasignarAgricultorDto) {
    return this.adminService.desasignarAgricultor(dto);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Listar todas las asignaciones activas (solo admin)' })
  @ApiResponse({ status: 200, description: 'Lista de asignaciones' })
  async getAllAsignaciones() {
    return this.adminService.getAllAsignaciones();
  }

  @Get('assignments/tecnico/:tecnicoId')
  @ApiOperation({ summary: 'Ver agricultores asignados a un técnico (solo admin)' })
  @ApiResponse({ status: 200, description: 'Agricultores del técnico' })
  async getAgricultoresDeTecnico(@Param('tecnicoId') tecnicoId: string) {
    return this.adminService.getAgricultoresDeTecnico(tecnicoId);
  }

  @Get('assignments/agricultor/:agricultorId')
  @ApiOperation({ summary: 'Ver técnicos asignados a un agricultor (solo admin)' })
  @ApiResponse({ status: 200, description: 'Técnicos del agricultor' })
  async getTecnicosDeAgricultor(@Param('agricultorId') agricultorId: string) {
    return this.adminService.getTecnicosDeAgricultor(agricultorId);
  }
}
