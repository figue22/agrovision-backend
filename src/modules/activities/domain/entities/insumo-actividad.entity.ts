import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';
import { CatTipoInsumo } from '@modules/catalogs/domain/entities/cat-tipo-insumo.entity';

@Entity('insumos_actividad')
export class InsumoActividad {
  @PrimaryGeneratedColumn('uuid')
  insumo_actividad_id: string;

  @Column({ type: 'uuid' })
  actividad_id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre_insumo: string;

  @Column({ type: 'integer' })
  tipo_insumo_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'varchar', length: 20 })
  unidad: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costo_unitario_cop: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  marca: string;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Actividad, (actividad) => actividad.insumos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actividad_id' })
  actividad: Actividad;

  @ManyToOne(() => CatTipoInsumo, (tipo) => tipo.insumosActividad)
  @JoinColumn({ name: 'tipo_insumo_id' })
  tipoInsumo: CatTipoInsumo;
}