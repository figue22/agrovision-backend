import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CatTipoActividad } from '@modules/catalogs/domain/entities/cat-tipo-actividad.entity';
import { CatTipoAlerta } from '@modules/catalogs/domain/entities/cat-tipo-alerta.entity';
import { CatTipoRecomendacion } from '@modules/catalogs/domain/entities/cat-tipo-recomendacion.entity';
import { CatTipoInsumo } from '@modules/catalogs/domain/entities/cat-tipo-insumo.entity';
import { CreateCatalogDto } from '@modules/catalogs/application/dto/create-catalog.dto';
import { UpdateCatalogDto } from '@modules/catalogs/application/dto/update-catalog.dto';

type CatalogEntity =
  | CatTipoActividad
  | CatTipoAlerta
  | CatTipoRecomendacion
  | CatTipoInsumo;

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatTipoActividad)
    private readonly tipoActividadRepo: Repository<CatTipoActividad>,
    @InjectRepository(CatTipoAlerta)
    private readonly tipoAlertaRepo: Repository<CatTipoAlerta>,
    @InjectRepository(CatTipoRecomendacion)
    private readonly tipoRecomendacionRepo: Repository<CatTipoRecomendacion>,
    @InjectRepository(CatTipoInsumo)
    private readonly tipoInsumoRepo: Repository<CatTipoInsumo>,
  ) {}

  private getRepo(tipo: string): Repository<CatalogEntity> {
    switch (tipo) {
      case 'tipos-actividad':
        return this.tipoActividadRepo as Repository<CatalogEntity>;
      case 'tipos-alerta':
        return this.tipoAlertaRepo as Repository<CatalogEntity>;
      case 'tipos-recomendacion':
        return this.tipoRecomendacionRepo as Repository<CatalogEntity>;
      case 'tipos-insumo':
        return this.tipoInsumoRepo as Repository<CatalogEntity>;
      default:
        throw new NotFoundException(`Catálogo '${tipo}' no existe`);
    }
  }

  private getNombreCatalogo(tipo: string): string {
    const nombres: Record<string, string> = {
      'tipos-actividad': 'tipo de actividad',
      'tipos-alerta': 'tipo de alerta',
      'tipos-recomendacion': 'tipo de recomendación',
      'tipos-insumo': 'tipo de insumo',
    };
    return nombres[tipo] || tipo;
  }

  async findAll(tipo: string): Promise<CatalogEntity[]> {
    const repo = this.getRepo(tipo);
    return repo.find({ order: { id: 'ASC' } });
  }

  async findActivos(tipo: string): Promise<CatalogEntity[]> {
    const repo = this.getRepo(tipo);
    return repo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(tipo: string, id: number): Promise<CatalogEntity> {
    const repo = this.getRepo(tipo);
    const item = await repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(
        `${this.getNombreCatalogo(tipo)} con id ${id} no encontrado`,
      );
    }

    return item;
  }

  async create(tipo: string, dto: CreateCatalogDto): Promise<CatalogEntity> {
    const repo = this.getRepo(tipo);
    const nombre = this.getNombreCatalogo(tipo);

    const existente = await repo.findOne({
      where: { codigo: dto.codigo },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe un ${nombre} con código '${dto.codigo}'`,
      );
    }

    const item = repo.create(dto);
    return repo.save(item);
  }

  async update(
    tipo: string,
    id: number,
    dto: UpdateCatalogDto,
  ): Promise<CatalogEntity> {
    const repo = this.getRepo(tipo);
    const item = await this.findOne(tipo, id);

    if (dto.codigo && dto.codigo !== (item as any).codigo) {
      const existente = await repo.findOne({
        where: { codigo: dto.codigo },
      });

      if (existente) {
        throw new ConflictException(
          `Ya existe un ${this.getNombreCatalogo(tipo)} con código '${dto.codigo}'`,
        );
      }
    }

    Object.assign(item, dto);
    return repo.save(item);
  }

  async remove(tipo: string, id: number): Promise<void> {
    const item = await this.findOne(tipo, id);
    const repo = this.getRepo(tipo);
    await repo.remove(item);
  }

  async toggleActivo(tipo: string, id: number): Promise<CatalogEntity> {
    const item = await this.findOne(tipo, id);
    (item as any).activo = !(item as any).activo;
    const repo = this.getRepo(tipo);
    return repo.save(item);
  }

  async getResumen(): Promise<{
    tipos_actividad: number;
    tipos_alerta: number;
    tipos_recomendacion: number;
    tipos_insumo: number;
  }> {
    const [actividad, alerta, recomendacion, insumo] = await Promise.all([
      this.tipoActividadRepo.count(),
      this.tipoAlertaRepo.count(),
      this.tipoRecomendacionRepo.count(),
      this.tipoInsumoRepo.count(),
    ]);

    return {
      tipos_actividad: actividad,
      tipos_alerta: alerta,
      tipos_recomendacion: recomendacion,
      tipos_insumo: insumo,
    };
  }
}