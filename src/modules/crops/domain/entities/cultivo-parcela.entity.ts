import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { EstadoCultivo } from '../../../../common/enums/enums';;
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';

@Entity('cultivos_parcela')
export class CultivoParcela {
  @PrimaryGeneratedColumn('uuid')
  cultivo_parcela_id: string;

  @Column({ type: 'uuid' })
  parcela_id: string;

  @Column({ type: 'uuid' })
  tipo_cultivo_id: string;

  @Column({ type: 'date' })
  fecha_siembra: Date;

  @Column({ type: 'date', nullable: true })
  fecha_cosecha_esperada: Date;

  @Column({ type: 'date', nullable: true })
  fecha_cosecha_real: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area_sembrada_ha: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rendimiento_esperado_ton: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rendimiento_real_ton: number;

  @Index('idx_cultivos_parcela_estado')
  @Column({ type: 'enum', enum: EstadoCultivo })
  estado: EstadoCultivo;

  @Column({ type: 'varchar', length: 20, nullable: true })
  temporada: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Parcela, (parcela) => parcela.cultivosParcela, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcela_id' })
  parcela: Parcela;

  @ManyToOne(() => TipoCultivo, (tipo) => tipo.cultivosParcela)
  @JoinColumn({ name: 'tipo_cultivo_id' })
  tipoCultivo: TipoCultivo;

  @OneToMany(() => Prediccion, (prediccion) => prediccion.cultivoParcela)
  predicciones: Prediccion[];
}