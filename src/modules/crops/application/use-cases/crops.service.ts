import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { CreateTipoCultivoDto } from '@modules/crops/application/dto/create-tipo-cultivo.dto';
import { UpdateTipoCultivoDto } from '@modules/crops/application/dto/update-tipo-cultivo.dto';

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(TipoCultivo)
    private readonly tipoCultivoRepository: Repository<TipoCultivo>,
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
}
