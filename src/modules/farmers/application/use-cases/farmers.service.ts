import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { UpdateAgricultorDto } from '@modules/farmers/application/dto/update-agricultor.dto';
import { Rol } from '@common/enums/enums';

@Injectable()
export class FarmersService {
  constructor(
    @InjectRepository(Agricultor)
    private readonly agricultorRepository: Repository<Agricultor>,
    @InjectRepository(AsignacionTecnico)
    private readonly asignacionRepository: Repository<AsignacionTecnico>,
  ) {}

  async findByUsuarioId(usuarioId: string): Promise<Agricultor> {
    const agricultor = await this.agricultorRepository.findOne({
      where: { usuario_id: usuarioId },
      relations: ['usuario'],
    });

    if (!agricultor) {
      throw new NotFoundException('Perfil de agricultor no encontrado');
    }

    return agricultor;
  }

  async findById(agricultorId: string): Promise<Agricultor> {
    const agricultor = await this.agricultorRepository.findOne({
      where: { agricultor_id: agricultorId },
      relations: ['usuario'],
    });

    if (!agricultor) {
      throw new NotFoundException('Agricultor no encontrado');
    }

    return agricultor;
  }

  async update(usuarioId: string, dto: UpdateAgricultorDto): Promise<Agricultor> {
    const agricultor = await this.findByUsuarioId(usuarioId);

    Object.assign(agricultor, {
      ...(dto.direccion !== undefined && { direccion: dto.direccion }),
      ...(dto.municipio !== undefined && { municipio: dto.municipio }),
      ...(dto.departamento !== undefined && { departamento: dto.departamento }),
      ...(dto.tamano_finca_ha !== undefined && { tamano_finca_ha: dto.tamano_finca_ha }),
    });

    return this.agricultorRepository.save(agricultor);
  }

  // ── Listar agricultores según el rol del usuario ──
  async findAll(usuarioId: string, rol: Rol): Promise<Agricultor[]> {
    // Admin ve todos
    if (rol === Rol.ADMIN) {
      return this.agricultorRepository.find({
        relations: ['usuario'],
      });
    }

    // Técnico ve solo sus asignados
    if (rol === Rol.TECNICO) {
      const asignaciones = await this.asignacionRepository.find({
        where: { tecnico_id: usuarioId, activa: true },
        relations: ['agricultor', 'agricultor.usuario'],
      });

      return asignaciones.map((a) => a.agricultor);
    }

    return [];
  }

  // ── Verificar que un técnico tiene acceso a un agricultor ──
  async verificarAccesoTecnico(tecnicoId: string, agricultorId: string): Promise<boolean> {
    const asignacion = await this.asignacionRepository.findOne({
      where: {
        tecnico_id: tecnicoId,
        agricultor_id: agricultorId,
        activa: true,
      },
    });

    return !!asignacion;
  }

  // ── Obtener agricultor con verificación de acceso por rol ──
  async findByIdConAcceso(
    agricultorId: string,
    usuarioId: string,
    rol: Rol,
  ): Promise<Agricultor> {
    const agricultor = await this.findById(agricultorId);

    // Admin ve cualquiera
    if (rol === Rol.ADMIN) {
      return agricultor;
    }

    // Técnico solo ve sus asignados
    if (rol === Rol.TECNICO) {
      const tieneAcceso = await this.verificarAccesoTecnico(usuarioId, agricultorId);
      if (!tieneAcceso) {
        throw new ForbiddenException('No tienes asignado a este agricultor');
      }
      return agricultor;
    }

    throw new ForbiddenException('Acceso denegado');
  }
}
