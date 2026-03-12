import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prioridad, EstadoImplementacion } from '../../../../common/enums/enums';;
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Documento } from '@modules/documents/domain/entities/documento.entity';
import { CatTipoRecomendacion } from '@modules/catalogs/domain/entities/cat-tipo-recomendacion.entity';

@Entity('recomendaciones')
export class Recomendacion {
  @PrimaryGeneratedColumn('uuid')
  recomendacion_id: string;

  @Column({ type: 'uuid' })
  prediccion_id: string;

  @Column({ type: 'uuid', nullable: true })
  documento_fuente_id: string;

  @Column({ type: 'integer' })
  tipo_recomendacion_id: number;

  @Column({ type: 'enum', enum: Prioridad })
  prioridad: Prioridad;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: EstadoImplementacion, default: EstadoImplementacion.PENDIENTE })
  estado_implementacion: EstadoImplementacion;

  @Column({ type: 'timestamp', nullable: true })
  fecha_implementacion: Date;

  @Column({ type: 'text', nullable: true })
  feedback_agricultor: string;

  @Column({ type: 'integer', nullable: true })
  calificacion_eficacia: number;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Prediccion, (prediccion) => prediccion.recomendaciones)
  @JoinColumn({ name: 'prediccion_id' })
  prediccion: Prediccion;

  @ManyToOne(() => Documento, (doc) => doc.recomendaciones, { nullable: true })
  @JoinColumn({ name: 'documento_fuente_id' })
  documentoFuente: Documento;

  @ManyToOne(() => CatTipoRecomendacion, (tipo) => tipo.recomendaciones)
  @JoinColumn({ name: 'tipo_recomendacion_id' })
  tipoRecomendacion: CatTipoRecomendacion;
}