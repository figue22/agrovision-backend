import {
  Controller,
  Get,
  Put,
  Post,
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
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { CreateUserDto } from '@modules/admin/application/dto/create-user.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Listar todos los usuarios (solo admin)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - se requiere rol admin' })
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

  @Put('users/role')
  @ApiOperation({ summary: 'Cambiar rol de un usuario (solo admin)' })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  @ApiResponse({ status: 400, description: 'No puedes cambiar tu propio rol' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
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
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async toggleStatus(
    @Body() dto: ToggleUserStatusDto,
    @CurrentUser() admin: Usuario,
  ) {
    return this.adminService.toggleUserStatus(dto, admin.usuario_id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Crear usuario con rol específico (solo admin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'El correo ya existe' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }
}
