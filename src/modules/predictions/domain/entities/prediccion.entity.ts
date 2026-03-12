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
import { NivelRiesgo } from '../../../../common/enums/enums';;
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { Recomendacion } from '@modules/recommendations/domain/entities/recomendacion.entity';

@Entity('predicciones')
@Index('idx_predicciones_parcela_fecha', ['parcela_id', 'fecha_prediccion'])
export class Prediccion {
  @PrimaryGeneratedColumn('uuid')
  prediccion_id: string;

  @Column({ type: 'uuid' })
  parcela_id: string;

  @Column({ type: 'uuid', nullable: true })
  cultivo_parcela_id: string;

  @Column({ type: 'uuid' })
  tipo_cultivo_id: string;

  @Column({ type: 'varchar', length: 20 })
  version_modelo: string;

  @Column({ type: 'varchar', length: 30 })
  tipo_modelo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rendimiento_predicho_ton: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  puntaje_confianza: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  intervalo_conf_inferior: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  intervalo_conf_superior: number;

  @Column({ type: 'enum', enum: NivelRiesgo })
  nivel_riesgo: NivelRiesgo;

  @Column({ type: 'jsonb', nullable: true })
  factores_riesgo: object;

  @Column({ type: 'jsonb', nullable: true })
  datos_clima_usados: object;

  @Column({ type: 'jsonb', nullable: true })
  importancia_features: object;

  @Column({ type: 'timestamp' })
  fecha_prediccion: Date;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Parcela, (parcela) => parcela.predicciones)
  @JoinColumn({ name: 'parcela_id' })
  parcela: Parcela;

  @ManyToOne(() => CultivoParcela, (cultivo) => cultivo.predicciones, { nullable: true })
  @JoinColumn({ name: 'cultivo_parcela_id' })
  cultivoParcela: CultivoParcela;

  @ManyToOne(() => TipoCultivo, (tipo) => tipo.predicciones)
  @JoinColumn({ name: 'tipo_cultivo_id' })
  tipoCultivo: TipoCultivo;

  @OneToMany(() => Recomendacion, (rec) => rec.prediccion)
  recomendaciones: Recomendacion[];
}