import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { RequerimientoAgua } from '../../../../common/enums/enums';;
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';

@Entity('tipos_cultivo')
export class TipoCultivo {
  @PrimaryGeneratedColumn('uuid')
  tipo_cultivo_id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre_cientifico: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  categoria: string;

  @Column({ type: 'integer', nullable: true })
  dias_crecimiento_prom: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temp_optima_min: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temp_optima_max: number;

  @Column({ type: 'integer', nullable: true })
  altitud_optima_min: number;

  @Column({ type: 'integer', nullable: true })
  altitud_optima_max: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  ph_optimo_min: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  ph_optimo_max: number;

  @Column({ type: 'enum', enum: RequerimientoAgua, nullable: true })
  req_agua: RequerimientoAgua;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @OneToMany(() => CultivoParcela, (cultivo) => cultivo.tipoCultivo)
  cultivosParcela: CultivoParcela[];

  @OneToMany(() => Prediccion, (prediccion) => prediccion.tipoCultivo)
  predicciones: Prediccion[];
}