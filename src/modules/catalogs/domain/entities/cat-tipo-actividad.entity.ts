import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';

@Entity('cat_tipos_actividad')
export class CatTipoActividad {
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

  @OneToMany(() => Actividad, (actividad) => actividad.tipoActividad)
  actividades: Actividad[];
}