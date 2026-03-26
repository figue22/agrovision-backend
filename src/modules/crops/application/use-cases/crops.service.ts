import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { CreateTipoCultivoDto } from '@modules/crops/application/dto/create-tipo-cultivo.dto';
import { UpdateTipoCultivoDto } from '@modules/crops/application/dto/update-tipo-cultivo.dto';
import { CreateCultivoParcelaDto } from '@modules/crops/application/dto/create-cultivo-parcela.dto';
import { UpdateCultivoParcelaDto } from '@modules/crops/application/dto/update-cultivo-parcela.dto';
import {Rol, EstadoCultivo} from '@common/enums/enums';

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(TipoCultivo)
    private readonly tipoCultivoRepository: Repository<TipoCultivo>,
    @InjectRepository(CultivoParcela)
    private readonly cultivoParcelaRepository: Repository<CultivoParcela>,
    @InjectRepository(Parcela)
    private readonly parcelaRepository: Repository<Parcela>,
    @InjectRepository(Agricultor)
    private readonly agricultorRepository: Repository<Agricultor>,
    @InjectRepository(AsignacionTecnico)
    private readonly asignacionRepository: Repository<AsignacionTecnico>,
  ) {}

  // ── Listar todos los tipos de cultivo ──
  async findAll(): Promise<TipoCultivo[]> {
    return this.tipoCultivoRepository.find({
      order: { nombre: 'ASC' },
    });
  }

  // ── Buscar por ID ──
  async findById(id: string): Promise<TipoCultivo> {
    const tipo = await this.tipoCultivoRepository.findOne({
      where: { tipo_cultivo_id: id },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de cultivo no encontrado');
    }

    return tipo;
  }

  // ── Buscar por categoría ──
  async findByCategoria(categoria: string): Promise<TipoCultivo[]> {
    return this.tipoCultivoRepository.find({
      where: { categoria },
      order: { nombre: 'ASC' },
    });
  }

  // ── Crear tipo de cultivo ──
  async create(dto: CreateTipoCultivoDto): Promise<TipoCultivo> {
    const existente = await this.tipoCultivoRepository.findOne({
      where: { nombre: dto.nombre.trim() },
    });

    if (existente) {
      throw new ConflictException(`Ya existe un tipo de cultivo con el nombre "${dto.nombre}"`);
    }

    // Validar que temp_min < temp_max si ambos están presentes
    if (
      dto.temp_optima_min !== undefined &&
      dto.temp_optima_max !== undefined &&
      dto.temp_optima_min >= dto.temp_optima_max
    ) {
      throw new ConflictException('La temperatura mínima debe ser menor que la máxima');
    }

    // Validar que ph_min < ph_max si ambos están presentes
    if (
      dto.ph_optimo_min !== undefined &&
      dto.ph_optimo_max !== undefined &&
      dto.ph_optimo_min >= dto.ph_optimo_max
    ) {
      throw new ConflictException('El pH mínimo debe ser menor que el máximo');
    }

    const tipo = this.tipoCultivoRepository.create({
      nombre: dto.nombre.trim(),
      nombre_cientifico: dto.nombre_cientifico?.trim(),
      categoria: dto.categoria?.trim(),
      dias_crecimiento_prom: dto.dias_crecimiento_prom,
      temp_optima_min: dto.temp_optima_min,
      temp_optima_max: dto.temp_optima_max,
      altitud_optima_min: dto.altitud_optima_min,
      altitud_optima_max: dto.altitud_optima_max,
      ph_optimo_min: dto.ph_optimo_min,
      ph_optimo_max: dto.ph_optimo_max,
      req_agua: dto.req_agua,
    });

    return this.tipoCultivoRepository.save(tipo);
  }

  // ── Actualizar tipo de cultivo ──
  async update(id: string, dto: UpdateTipoCultivoDto): Promise<TipoCultivo> {
    const tipo = await this.findById(id);

    // Validar nombre único si se está cambiando
    if (dto.nombre !== undefined && dto.nombre.trim() !== tipo.nombre) {
      const existente = await this.tipoCultivoRepository.findOne({
        where: { nombre: dto.nombre.trim() },
      });
      if (existente) {
        throw new ConflictException(`Ya existe un tipo de cultivo con el nombre "${dto.nombre}"`);
      }
    }

    // Determinar valores finales para validaciones
    const tempMin = dto.temp_optima_min ?? tipo.temp_optima_min;
    const tempMax = dto.temp_optima_max ?? tipo.temp_optima_max;
    if (tempMin !== null && tempMax !== null && tempMin >= tempMax) {
      throw new ConflictException('La temperatura mínima debe ser menor que la máxima');
    }

    const phMin = dto.ph_optimo_min ?? tipo.ph_optimo_min;
    const phMax = dto.ph_optimo_max ?? tipo.ph_optimo_max;
    if (phMin !== null && phMax !== null && phMin >= phMax) {
      throw new ConflictException('El pH mínimo debe ser menor que el máximo');
    }

    // Aplicar cambios
    if (dto.nombre !== undefined) tipo.nombre = dto.nombre.trim();
    if (dto.nombre_cientifico !== undefined) tipo.nombre_cientifico = dto.nombre_cientifico.trim();
    if (dto.categoria !== undefined) tipo.categoria = dto.categoria.trim();
    if (dto.dias_crecimiento_prom !== undefined) tipo.dias_crecimiento_prom = dto.dias_crecimiento_prom;
    if (dto.temp_optima_min !== undefined) tipo.temp_optima_min = dto.temp_optima_min;
    if (dto.temp_optima_max !== undefined) tipo.temp_optima_max = dto.temp_optima_max;
    if (dto.altitud_optima_min !== undefined) tipo.altitud_optima_min = dto.altitud_optima_min;
    if (dto.altitud_optima_max !== undefined) tipo.altitud_optima_max = dto.altitud_optima_max;
    if (dto.ph_optimo_min !== undefined) tipo.ph_optimo_min = dto.ph_optimo_min;
    if (dto.ph_optimo_max !== undefined) tipo.ph_optimo_max = dto.ph_optimo_max;
    if (dto.req_agua !== undefined) tipo.req_agua = dto.req_agua;

    return this.tipoCultivoRepository.save(tipo);
  }

  // ── Eliminar tipo de cultivo ──
  async remove(id: string): Promise<void> {
    const tipo = await this.findById(id);
    await this.tipoCultivoRepository.remove(tipo);
  }

  // ══════════════════════════════════════════
  // CULTIVOS POR PARCELA
  // ══════════════════════════════════════════

  // ── Crear cultivo en parcela ──
  async createCultivoParcela(
    dto: CreateCultivoParcelaDto,
    usuarioId: string,
    rol: Rol,
  ): Promise<CultivoParcela> {
    // Verificar que la parcela existe
    const parcela = await this.parcelaRepository.findOne({
      where: { parcela_id: dto.parcela_id },
    });
    if (!parcela) throw new NotFoundException('Parcela no encontrada');

    // Verificar que el usuario es dueño de la parcela
    await this.verificarAccesoPropietario(parcela, usuarioId, rol);

    // Verificar que el tipo de cultivo existe
    const tipoCultivo = await this.tipoCultivoRepository.findOne({
      where: { tipo_cultivo_id: dto.tipo_cultivo_id },
    });
    if (!tipoCultivo) throw new NotFoundException('Tipo de cultivo no encontrado');

    // Validar fechas
    if (dto.fecha_cosecha_esperada && new Date(dto.fecha_cosecha_esperada) <= new Date(dto.fecha_siembra)) {
      throw new BadRequestException('La fecha de cosecha esperada debe ser posterior a la de siembra');
    }

    // Validar área sembrada vs área de parcela
    if (dto.area_sembrada_ha && dto.area_sembrada_ha > Number(parcela.area_hectareas)) {
      throw new BadRequestException(
        `El área sembrada (${dto.area_sembrada_ha} ha) no puede ser mayor al área de la parcela (${parcela.area_hectareas} ha)`,
      );
    }

    // Auto-calcular fecha cosecha esperada si no se proporcionó
    let fechaCosechaEsperada = dto.fecha_cosecha_esperada;
    if (!fechaCosechaEsperada && tipoCultivo.dias_crecimiento_prom) {
      const siembra = new Date(dto.fecha_siembra);
      siembra.setDate(siembra.getDate() + tipoCultivo.dias_crecimiento_prom);
      fechaCosechaEsperada = siembra.toISOString().split('T')[0];
    }

    const cultivo = this.cultivoParcelaRepository.create({
      parcela_id: dto.parcela_id,
      tipo_cultivo_id: dto.tipo_cultivo_id,
      fecha_siembra: dto.fecha_siembra,
      fecha_cosecha_esperada: fechaCosechaEsperada,
      area_sembrada_ha: dto.area_sembrada_ha,
      rendimiento_esperado_ton: dto.rendimiento_esperado_ton,
      estado: dto.estado || EstadoCultivo.PLANIFICADO,
      temporada: dto.temporada?.trim(),
      notas: dto.notas?.trim(),
    });

    const guardado = await this.cultivoParcelaRepository.save(cultivo);

    return this.cultivoParcelaRepository.findOne({
      where: { cultivo_parcela_id: guardado.cultivo_parcela_id },
      relations: ['parcela', 'tipoCultivo'],
    }) as Promise<CultivoParcela>;
  }

  // ── Listar todos los cultivos (admin/técnico) ──
  async findAllCultivos(usuarioId: string, rol: Rol): Promise<CultivoParcela[]> {
    if (rol === Rol.ADMIN) {
      return this.cultivoParcelaRepository.find({
        relations: ['parcela', 'tipoCultivo', 'parcela.agricultor', 'parcela.agricultor.usuario'],
        order: { fecha_siembra: 'DESC' },
      });
    }

    if (rol === Rol.TECNICO) {
      const asignaciones = await this.asignacionRepository.find({
        where: { tecnico_id: usuarioId, activa: true },
      });
      const agricultorIds = asignaciones.map((a) => a.agricultor_id);

      if (agricultorIds.length === 0) return [];

      return this.cultivoParcelaRepository
        .createQueryBuilder('cp')
        .leftJoinAndSelect('cp.parcela', 'p')
        .leftJoinAndSelect('cp.tipoCultivo', 'tc')
        .leftJoinAndSelect('p.agricultor', 'a')
        .leftJoinAndSelect('a.usuario', 'u')
        .where('p.agricultor_id IN (:...ids)', { ids: agricultorIds })
        .orderBy('cp.fecha_siembra', 'DESC')
        .getMany();
    }

    return [];
  }

  // ── Listar cultivos de una parcela ──
  async findCultivosByParcela(
    parcelaId: string,
    usuarioId: string,
    rol: Rol,
  ): Promise<CultivoParcela[]> {
    const parcela = await this.parcelaRepository.findOne({
      where: { parcela_id: parcelaId },
    });
    if (!parcela) throw new NotFoundException('Parcela no encontrada');

    await this.verificarAcceso(parcela, usuarioId, rol);

    return this.cultivoParcelaRepository.find({
      where: { parcela_id: parcelaId },
      relations: ['tipoCultivo'],
      order: { fecha_siembra: 'DESC' },
    });
  }

  // ── Listar mis cultivos (agricultor) ──
  async findMyCultivos(usuarioId: string): Promise<CultivoParcela[]> {
    const agricultor = await this.agricultorRepository.findOne({
      where: { usuario_id: usuarioId },
    });
    if (!agricultor) throw new ForbiddenException('Solo los agricultores tienen cultivos');

    return this.cultivoParcelaRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.parcela', 'p')
      .leftJoinAndSelect('cp.tipoCultivo', 'tc')
      .where('p.agricultor_id = :agricultorId', { agricultorId: agricultor.agricultor_id })
      .orderBy('cp.fecha_siembra', 'DESC')
      .getMany();
  }

  // ── Obtener un cultivo por ID ──
  async findCultivoById(
    cultivoId: string,
    usuarioId: string,
    rol: Rol,
  ): Promise<CultivoParcela> {
    const cultivo = await this.cultivoParcelaRepository.findOne({
      where: { cultivo_parcela_id: cultivoId },
      relations: ['parcela', 'tipoCultivo'],
    });
    if (!cultivo) throw new NotFoundException('Cultivo no encontrado');

    await this.verificarAcceso(cultivo.parcela, usuarioId, rol);

    return cultivo;
  }

  // ── Actualizar cultivo ──
  async updateCultivoParcela(
    cultivoId: string,
    dto: UpdateCultivoParcelaDto,
    usuarioId: string,
    rol: Rol,
  ): Promise<CultivoParcela> {
    const cultivo = await this.cultivoParcelaRepository.findOne({
      where: { cultivo_parcela_id: cultivoId },
      relations: ['parcela'],
    });
    if (!cultivo) throw new NotFoundException('Cultivo no encontrado');

    await this.verificarAccesoPropietario(cultivo.parcela, usuarioId, rol);

    // Validar fecha cosecha esperada
    if (dto.fecha_cosecha_esperada && new Date(dto.fecha_cosecha_esperada) <= new Date(cultivo.fecha_siembra)) {
      throw new BadRequestException('La fecha de cosecha esperada debe ser posterior a la de siembra');
    }
    // Validar fecha cosecha real
    if (dto.fecha_cosecha_real && new Date(dto.fecha_cosecha_real) <= new Date(cultivo.fecha_siembra)) {
      throw new BadRequestException('La fecha de cosecha real debe ser posterior a la de siembra');
    }

    if (dto.fecha_cosecha_esperada !== undefined) cultivo.fecha_cosecha_esperada = dto.fecha_cosecha_esperada as any;
    if (dto.fecha_cosecha_real !== undefined) cultivo.fecha_cosecha_real = dto.fecha_cosecha_real as any;
    if (dto.area_sembrada_ha !== undefined) cultivo.area_sembrada_ha = dto.area_sembrada_ha;
    if (dto.rendimiento_esperado_ton !== undefined) cultivo.rendimiento_esperado_ton = dto.rendimiento_esperado_ton;
    if (dto.rendimiento_real_ton !== undefined) cultivo.rendimiento_real_ton = dto.rendimiento_real_ton;
    if (dto.estado !== undefined) cultivo.estado = dto.estado;
    if (dto.temporada !== undefined) cultivo.temporada = dto.temporada.trim();
    if (dto.notas !== undefined) cultivo.notas = dto.notas.trim();

    await this.cultivoParcelaRepository.save(cultivo);

    return this.cultivoParcelaRepository.findOne({
      where: { cultivo_parcela_id: cultivoId },
      relations: ['parcela', 'tipoCultivo'],
    }) as Promise<CultivoParcela>;
  }

  // ── Eliminar cultivo ──
  async removeCultivoParcela(
    cultivoId: string,
    usuarioId: string,
    rol: Rol,
  ): Promise<void> {
    const cultivo = await this.cultivoParcelaRepository.findOne({
      where: { cultivo_parcela_id: cultivoId },
      relations: ['parcela'],
    });
    if (!cultivo) throw new NotFoundException('Cultivo no encontrado');

    await this.verificarAccesoPropietario(cultivo.parcela, usuarioId, rol);

    await this.cultivoParcelaRepository.remove(cultivo);
  }

  // ══════════════════════════════════════════
  // HELPERS DE ACCESO
  // ══════════════════════════════════════════

  private async verificarAcceso(parcela: Parcela, usuarioId: string, rol: Rol): Promise<void> {
    if (rol === Rol.ADMIN) return;

    if (rol === Rol.AGRICULTOR) {
      const agricultor = await this.agricultorRepository.findOne({ where: { usuario_id: usuarioId } });
      if (!agricultor || parcela.agricultor_id !== agricultor.agricultor_id) {
        throw new ForbiddenException('No tienes acceso a esta parcela');
      }
      return;
    }

    if (rol === Rol.TECNICO) {
      const asignacion = await this.asignacionRepository.findOne({
        where: { tecnico_id: usuarioId, agricultor_id: parcela.agricultor_id, activa: true },
      });
      if (!asignacion) throw new ForbiddenException('No tienes asignado al agricultor de esta parcela');
      return;
    }

    throw new ForbiddenException('Acceso denegado');
  }

  private async verificarAccesoPropietario(parcela: Parcela, usuarioId: string, rol: Rol): Promise<void> {
    if (rol === Rol.ADMIN) return;

    if (rol === Rol.AGRICULTOR) {
      const agricultor = await this.agricultorRepository.findOne({ where: { usuario_id: usuarioId } });
      if (!agricultor || parcela.agricultor_id !== agricultor.agricultor_id) {
        throw new ForbiddenException('Solo puedes modificar cultivos de tus propias parcelas');
      }
      return;
    }

    throw new ForbiddenException('Solo el propietario o admin puede modificar cultivos');
  }
}


  


