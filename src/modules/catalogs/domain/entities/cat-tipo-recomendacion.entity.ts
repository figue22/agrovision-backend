import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Recomendacion } from '@modules/recommendations/domain/entities/recomendacion.entity';

@Entity('cat_tipos_recomendacion')
export class CatTipoRecomendacion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // ── Relaciones ──

  @OneToMany(() => Recomendacion, (rec) => rec.tipoRecomendacion)
  recomendaciones: Recomendacion[];
}