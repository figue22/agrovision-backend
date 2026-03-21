import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { ChangeRoleDto } from '@modules/admin/application/dto/change-role.dto';
import { ToggleUserStatusDto } from '@modules/admin/application/dto/toggle-user-status.dto';
import { CreateUserDto } from '@modules/admin/application/dto/create-user.dto';
import {
  AsignarAgricultorDto,
  DesasignarAgricultorDto,
} from '@modules/admin/application/dto/asignar-agricultor.dto';
import { Rol } from '@common/enums/enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Agricultor)
    private readonly agricultorRepository: Repository<Agricultor>,
    @InjectRepository(AsignacionTecnico)
    private readonly asignacionRepository: Repository<AsignacionTecnico>,
  ) {}

  // ── Listar todos los usuarios ──
  async findAllUsers(): Promise<Usuario[]> {
    return this.usuarioRepository.find({
      select: [
        'usuario_id', 'correo', 'nombre', 'apellido', 'telefono',
        'rol', 'tiene_2fa', 'esta_activo', 'ultimo_login', 'creado_en',
      ],
      order: { creado_en: 'DESC' },
    });
  }

  // ── Obtener usuario por ID ──
  async findUserById(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { usuario_id: usuarioId },
      select: [
        'usuario_id', 'correo', 'nombre', 'apellido', 'telefono',
        'rol', 'tiene_2fa', 'esta_activo', 'ultimo_login', 'creado_en', 'actualizado_en',
      ],
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  // ── Crear usuario con rol ──
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

  // ══════════════════════════════════════════
  // ASIGNACIONES TÉCNICO ↔ AGRICULTOR
  // ══════════════════════════════════════════

  // ── Asignar agricultor a técnico ──
  async asignarAgricultor(dto: AsignarAgricultorDto): Promise<AsignacionTecnico> {
    // Verificar que el técnico existe y tiene rol tecnico
    const tecnico = await this.usuarioRepository.findOne({
      where: { usuario_id: dto.tecnico_id },
    });

    if (!tecnico) {
      throw new NotFoundException('Técnico no encontrado');
    }

    if (tecnico.rol !== Rol.TECNICO) {
      throw new BadRequestException('El usuario no tiene rol de técnico');
    }

    // Verificar que el agricultor existe
    const agricultor = await this.agricultorRepository.findOne({
      where: { agricultor_id: dto.agricultor_id },
    });

    if (!agricultor) {
      throw new NotFoundException('Agricultor no encontrado');
    }

    // Verificar si ya existe la asignación
    const existente = await this.asignacionRepository.findOne({
      where: { tecnico_id: dto.tecnico_id, agricultor_id: dto.agricultor_id },
    });

    if (existente) {
      if (existente.activa) {
        throw new ConflictException('El agricultor ya está asignado a este técnico');
      }
      // Reactivar asignación existente
      existente.activa = true;
      existente.notas = dto.notas || existente.notas;
      return this.asignacionRepository.save(existente);
    }

    // Crear nueva asignación
    const asignacion = this.asignacionRepository.create({
      tecnico_id: dto.tecnico_id,
      agricultor_id: dto.agricultor_id,
      notas: dto.notas,
    });

    return this.asignacionRepository.save(asignacion);
  }

  // ── Desasignar agricultor de técnico ──
  async desasignarAgricultor(dto: DesasignarAgricultorDto): Promise<AsignacionTecnico> {
    const asignacion = await this.asignacionRepository.findOne({
      where: {
        tecnico_id: dto.tecnico_id,
        agricultor_id: dto.agricultor_id,
        activa: true,
      },
    });

    if (!asignacion) {
      throw new NotFoundException('Asignación no encontrada');
    }

    asignacion.activa = false;
    return this.asignacionRepository.save(asignacion);
  }

  // ── Ver agricultores asignados a un técnico ──
  async getAgricultoresDeTecnico(tecnicoId: string): Promise<AsignacionTecnico[]> {
    return this.asignacionRepository.find({
      where: { tecnico_id: tecnicoId, activa: true },
      relations: ['agricultor', 'agricultor.usuario'],
    });
  }

  // ── Ver técnicos asignados a un agricultor ──
  async getTecnicosDeAgricultor(agricultorId: string): Promise<AsignacionTecnico[]> {
    return this.asignacionRepository.find({
      where: { agricultor_id: agricultorId, activa: true },
      relations: ['tecnico'],
    });
  }

  // ── Listar todas las asignaciones activas ──
  async getAllAsignaciones(): Promise<AsignacionTecnico[]> {
    return this.asignacionRepository.find({
      where: { activa: true },
      relations: ['tecnico', 'agricultor', 'agricultor.usuario'],
      order: { fecha_asignacion: 'DESC' },
    });
  }
}
