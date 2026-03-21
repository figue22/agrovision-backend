import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { CreateParcelaDto, UpdateParcelaDto, ParcelaResponseDto } from '@modules/parcels/application/dto';
import { ParcelaMapper } from '@modules/parcels/application/mappers/parcela.mapper';
import { Rol } from '@common/enums/enums';

@Injectable()
export class ParcelsService {
  constructor(
    @InjectRepository(Parcela)
    private readonly parcelaRepository: Repository<Parcela>,
    @InjectRepository(Agricultor)
    private readonly agricultorRepository: Repository<Agricultor>,
    @InjectRepository(AsignacionTecnico)
    private readonly asignacionRepository: Repository<AsignacionTecnico>,
  ) {}

  // ── CREAR PARCELA ──
  async create(usuarioId: string, dto: CreateParcelaDto): Promise<ParcelaResponseDto> {
    // Buscar el agricultor vinculado al usuario
    const agricultor = await this.agricultorRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!agricultor) {
      throw new ForbiddenException('Solo los agricultores pueden crear parcelas');
    }

    const parcela = this.parcelaRepository.create({
      agricultor_id: agricultor.agricultor_id,
      nombre: dto.nombre.trim(),
      ubicacion: ParcelaMapper.ubicacionToGeoJSON(dto.ubicacion),
      area_hectareas: dto.area_hectareas,
      tipo_suelo: dto.tipo_suelo,
      ph_suelo: dto.ph_suelo,
      altitud_msnm: dto.altitud_msnm,
      limites_geojson: dto.limites_geojson || undefined,
    });

    const guardada = await this.parcelaRepository.save(parcela);

    // Recargar para obtener la ubicación en formato GeoJSON correcto
    const recargada = await this.parcelaRepository.findOne({
      where: { parcela_id: guardada.parcela_id },
    });

    return ParcelaMapper.toResponseDto(recargada!);
  }

  // ── LISTAR MIS PARCELAS (agricultor) ──
  async findMyParcelas(usuarioId: string): Promise<ParcelaResponseDto[]> {
    const agricultor = await this.agricultorRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!agricultor) {
      throw new ForbiddenException('Solo los agricultores tienen parcelas');
    }

    const parcelas = await this.parcelaRepository.find({
      where: { agricultor_id: agricultor.agricultor_id },
      order: { creado_en: 'DESC' },
    });

    return ParcelaMapper.toResponseList(parcelas);
  }

  // ── LISTAR TODAS (admin/técnico con filtrado) ──
  async findAll(usuarioId: string, rol: Rol): Promise<ParcelaResponseDto[]> {
    if (rol === Rol.ADMIN) {
      const parcelas = await this.parcelaRepository.find({
        relations: ['agricultor', 'agricultor.usuario'],
        order: { creado_en: 'DESC' },
      });
      return ParcelaMapper.toResponseList(parcelas);
    }

    if (rol === Rol.TECNICO) {
      // Solo parcelas de agricultores asignados
      const asignaciones = await this.asignacionRepository.find({
        where: { tecnico_id: usuarioId, activa: true },
      });

      const agricultorIds = asignaciones.map((a) => a.agricultor_id);

      if (agricultorIds.length === 0) {
        return [];
      }

      const parcelas = await this.parcelaRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.agricultor', 'a')
        .leftJoinAndSelect('a.usuario', 'u')
        .where('p.agricultor_id IN (:...ids)', { ids: agricultorIds })
        .orderBy('p.creado_en', 'DESC')
        .getMany();

      return ParcelaMapper.toResponseList(parcelas);
    }

    return [];
  }

  // ── OBTENER UNA PARCELA ──
  async findOne(parcelaId: string, usuarioId: string, rol: Rol): Promise<ParcelaResponseDto> {
    const parcela = await this.parcelaRepository.findOne({
      where: { parcela_id: parcelaId },
      relations: ['agricultor'],
    });

    if (!parcela) {
      throw new NotFoundException('Parcela no encontrada');
    }

    // Verificar acceso según rol
    await this.verificarAcceso(parcela, usuarioId, rol);

    return ParcelaMapper.toResponseDto(parcela);
  }

  // ── ACTUALIZAR PARCELA ──
  async update(
    parcelaId: string,
    dto: UpdateParcelaDto,
    usuarioId: string,
    rol: Rol,
  ): Promise<ParcelaResponseDto> {
    const parcela = await this.parcelaRepository.findOne({
      where: { parcela_id: parcelaId },
      relations: ['agricultor'],
    });

    if (!parcela) {
      throw new NotFoundException('Parcela no encontrada');
    }

    // Solo el dueño o admin puede editar
    await this.verificarAccesoPropietario(parcela, usuarioId, rol);

    // Aplicar cambios
    if (dto.nombre !== undefined) parcela.nombre = dto.nombre.trim();
    if (dto.ubicacion !== undefined) {
      parcela.ubicacion = ParcelaMapper.ubicacionToGeoJSON(dto.ubicacion);
    }
    if (dto.area_hectareas !== undefined) parcela.area_hectareas = dto.area_hectareas;
    if (dto.tipo_suelo !== undefined) parcela.tipo_suelo = dto.tipo_suelo;
    if (dto.ph_suelo !== undefined) parcela.ph_suelo = dto.ph_suelo;
    if (dto.altitud_msnm !== undefined) parcela.altitud_msnm = dto.altitud_msnm;
    if (dto.limites_geojson !== undefined) parcela.limites_geojson = dto.limites_geojson;

    await this.parcelaRepository.save(parcela);

    const recargada = await this.parcelaRepository.findOne({
      where: { parcela_id: parcelaId },
    });

    return ParcelaMapper.toResponseDto(recargada!);
  }

  // ── ELIMINAR PARCELA ──
  async remove(parcelaId: string, usuarioId: string, rol: Rol): Promise<void> {
    const parcela = await this.parcelaRepository.findOne({
      where: { parcela_id: parcelaId },
      relations: ['agricultor'],
    });

    if (!parcela) {
      throw new NotFoundException('Parcela no encontrada');
    }

    await this.verificarAccesoPropietario(parcela, usuarioId, rol);

    await this.parcelaRepository.remove(parcela);
  }

  // ── BUSCAR PARCELAS CERCANAS (PostGIS) ──
  async findNearby(
    latitud: number,
    longitud: number,
    radioKm: number,
  ): Promise<ParcelaResponseDto[]> {
    const parcelas = await this.parcelaRepository
      .createQueryBuilder('p')
      .where(
        `ST_DWithin(p.ubicacion, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radio)`,
        { lat: latitud, lng: longitud, radio: radioKm * 1000 },
      )
      .orderBy(
        `ST_Distance(p.ubicacion, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)`,
        'ASC',
      )
      .setParameters({ lat: latitud, lng: longitud })
      .getMany();

    return ParcelaMapper.toResponseList(parcelas);
  }

  // ── HELPERS DE ACCESO ──

  private async verificarAcceso(
    parcela: Parcela,
    usuarioId: string,
    rol: Rol,
  ): Promise<void> {
    if (rol === Rol.ADMIN) return;

    if (rol === Rol.AGRICULTOR) {
      const agricultor = await this.agricultorRepository.findOne({
        where: { usuario_id: usuarioId },
      });
      if (!agricultor || parcela.agricultor_id !== agricultor.agricultor_id) {
        throw new ForbiddenException('No tienes acceso a esta parcela');
      }
      return;
    }

    if (rol === Rol.TECNICO) {
      const asignacion = await this.asignacionRepository.findOne({
        where: {
          tecnico_id: usuarioId,
          agricultor_id: parcela.agricultor_id,
          activa: true,
        },
      });
      if (!asignacion) {
        throw new ForbiddenException('No tienes asignado al agricultor de esta parcela');
      }
      return;
    }

    throw new ForbiddenException('Acceso denegado');
  }

  private async verificarAccesoPropietario(
    parcela: Parcela,
    usuarioId: string,
    rol: Rol,
  ): Promise<void> {
    if (rol === Rol.ADMIN) return;

    if (rol === Rol.AGRICULTOR) {
      const agricultor = await this.agricultorRepository.findOne({
        where: { usuario_id: usuarioId },
      });
      if (!agricultor || parcela.agricultor_id !== agricultor.agricultor_id) {
        throw new ForbiddenException('Solo puedes modificar tus propias parcelas');
      }
      return;
    }

    throw new ForbiddenException('Solo el propietario o admin puede modificar parcelas');
  }
}
