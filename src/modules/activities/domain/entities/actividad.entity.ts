import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { CatTipoActividad } from '@modules/catalogs/domain/entities/cat-tipo-actividad.entity';
import { InsumoActividad } from '@modules/activities/domain/entities/insumo-actividad.entity';

@Entity('actividades')
@Index('idx_actividades_parcela_fecha', ['parcela_id', 'fecha_realizacion'])
export class Actividad {
  @PrimaryGeneratedColumn('uuid')
  actividad_id: string;

  @Column({ type: 'uuid' })
  parcela_id: string;

  @Column({ type: 'uuid', nullable: true })
  realizada_por_id: string;

  @Column({ type: 'integer' })
  tipo_actividad_id: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cantidad: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unidad: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costo_cop: number;

  @Column({ type: 'jsonb', nullable: true })
  adjuntos: object;

  @Column({ type: 'date' })
  fecha_realizacion: Date;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Parcela, (parcela) => parcela.actividades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcela_id' })
  parcela: Parcela;

  @ManyToOne(() => Usuario, (usuario) => usuario.actividades, { nullable: true })
  @JoinColumn({ name: 'realizada_por_id' })
  realizadaPor: Usuario;

  @ManyToOne(() => CatTipoActividad, (tipo) => tipo.actividades)
  @JoinColumn({ name: 'tipo_actividad_id' })
  tipoActividad: CatTipoActividad;

  @OneToMany(() => InsumoActividad, (insumo) => insumo.actividad, { cascade: true })
  insumos: InsumoActividad[];
}