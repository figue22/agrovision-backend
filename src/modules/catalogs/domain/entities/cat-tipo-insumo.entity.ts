import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { InsumoActividad } from '@modules/activities/domain/entities/insumo-actividad.entity';

@Entity('cat_tipos_insumo')
export class CatTipoInsumo {
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

  @OneToMany(() => InsumoActividad, (insumo) => insumo.tipoInsumo)
  insumosActividad: InsumoActividad[];
}