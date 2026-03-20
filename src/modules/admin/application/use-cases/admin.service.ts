import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { ChangeRoleDto } from '@modules/admin/application/dto/change-role.dto';
import { ToggleUserStatusDto } from '@modules/admin/application/dto/toggle-user-status.dto';
import { Rol } from '@common/enums/enums';
import { CreateUserDto } from '@modules/admin/application/dto/create-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  // ── Listar todos los usuarios ──
  async findAllUsers(): Promise<Usuario[]> {
    return this.usuarioRepository.find({
      select: [
        'usuario_id',
        'correo',
        'nombre',
        'apellido',
        'telefono',
        'rol',
        'tiene_2fa',
        'esta_activo',
        'ultimo_login',
        'creado_en',
      ],
      order: { creado_en: 'DESC' },
    });
  }

  // ── Obtener usuario por ID ──
  async findUserById(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { usuario_id: usuarioId },
      select: [
        'usuario_id',
        'correo',
        'nombre',
        'apellido',
        'telefono',
        'rol',
        'tiene_2fa',
        'esta_activo',
        'ultimo_login',
        'creado_en',
        'actualizado_en',
      ],
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  // ── Cambiar rol de un usuario ──
  async changeRole(dto: ChangeRoleDto, adminId: string): Promise<Usuario> {
    if (dto.usuario_id === adminId) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { usuario_id: dto.usuario_id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    usuario.rol = dto.nuevo_rol;
    return this.usuarioRepository.save(usuario);
  }

  // ── Activar/desactivar usuario ──
  async toggleUserStatus(dto: ToggleUserStatusDto, adminId: string): Promise<Usuario> {
    if (dto.usuario_id === adminId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { usuario_id: dto.usuario_id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    usuario.esta_activo = dto.esta_activo;
    return this.usuarioRepository.save(usuario);
  }

  // ── Estadísticas de usuarios por rol ──
  async getUserStats(): Promise<{ rol: Rol; total: number }[]> {
    const stats = await this.usuarioRepository
      .createQueryBuilder('u')
      .select('u.rol', 'rol')
      .addSelect('COUNT(*)', 'total')
      .groupBy('u.rol')
      .getRawMany<{ rol: Rol; total: string }>();

    return stats.map((s) => ({ rol: s.rol, total: parseInt(s.total, 10) }));
  }

  // ── Crear nuevo usuario ──
  async createUser(dto: CreateUserDto): Promise<Usuario> {
  const existente = await this.usuarioRepository.findOne({
    where: { correo: dto.correo.toLowerCase().trim() },
  });

  if (existente) {
    throw new ConflictException('Ya existe un usuario con ese correo');
  }

  const contrasenaHash = await argon2.hash(dto.contrasena, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const usuario = this.usuarioRepository.create({
    correo: dto.correo.toLowerCase().trim(),
    contrasena_hash: contrasenaHash,
    nombre: dto.nombre.trim(),
    apellido: dto.apellido.trim(),
    telefono: dto.telefono?.trim(),
    rol: dto.rol,
  });

  return this.usuarioRepository.save(usuario);
  }
}
