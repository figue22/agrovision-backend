import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FarmersService } from '@modules/farmers/application/use-cases/farmers.service';
import { UpdateAgricultorDto } from '@modules/farmers/application/dto/update-agricultor.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Farmers')
@Controller('farmers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FarmersController {
  constructor(private readonly farmersService: FarmersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Obtener mi perfil de agricultor' })
  @ApiResponse({ status: 200, description: 'Perfil del agricultor' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getMyProfile(@CurrentUser() usuario: Usuario) {
    return this.farmersService.findByUsuarioId(usuario.usuario_id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Actualizar mi perfil de agricultor' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  async updateMyProfile(
    @CurrentUser() usuario: Usuario,
    @Body() dto: UpdateAgricultorDto,
  ) {
    return this.farmersService.update(usuario.usuario_id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Listar agricultores (admin: todos, técnico: solo asignados)' })
  @ApiResponse({ status: 200, description: 'Lista de agricultores' })
  async findAll(@CurrentUser() usuario: Usuario) {
    return this.farmersService.findAll(usuario.usuario_id, usuario.rol);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Obtener agricultor por ID (con verificación de acceso)' })
  @ApiResponse({ status: 200, description: 'Agricultor encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes asignado a este agricultor' })
  @ApiResponse({ status: 404, description: 'Agricultor no encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.farmersService.findByIdConAcceso(id, usuario.usuario_id, usuario.rol);
  }
}
