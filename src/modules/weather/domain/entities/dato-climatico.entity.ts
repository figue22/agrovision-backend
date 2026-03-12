import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';

@Entity('datos_climaticos')
@Unique('uq_datos_climaticos_parcela_fecha_fuente', ['parcela_id', 'fecha', 'fuente'])
@Index('idx_datos_climaticos_parcela_fecha', ['parcela_id', 'fecha'])
export class DatoClimatico {
  @PrimaryGeneratedColumn('uuid')
  dato_climatico_id: string;

  @Column({ type: 'uuid' })
  parcela_id: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temp_maxima: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temp_minima: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temp_promedio: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  precipitacion_mm: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humedad_pct: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  velocidad_viento: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  indice_uv: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  cobertura_nubes_pct: number;

  @Column({ type: 'varchar', length: 50 })
  fuente: string;

  @Column({ type: 'jsonb', nullable: true })
  datos_crudos: object;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Parcela, (parcela) => parcela.datosClimaticos)
  @JoinColumn({ name: 'parcela_id' })
  parcela: Parcela;
}