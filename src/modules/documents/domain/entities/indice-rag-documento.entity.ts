import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EstadoIndiceRag } from '../../../../common/enums/enums';;
import { Documento } from '@modules/documents/domain/entities/documento.entity';

@Entity('indice_rag_documentos')
export class IndiceRagDocumento {
  @PrimaryGeneratedColumn('uuid')
  indice_rag_id: string;

  @Column({ type: 'uuid', unique: true })
  documento_id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre_coleccion: string;

  @Column({ type: 'integer' })
  cantidad_chunks: number;

  @Column({ type: 'integer', nullable: true, default: 512 })
  tamano_chunk_tokens: number;

  @Column({ type: 'integer', nullable: true, default: 50 })
  overlap_tokens: number;

  @Column({ type: 'varchar', length: 100 })
  modelo_embedding: string;

  @Column({ type: 'integer' })
  dimensiones_embedding: number;

  @Index('idx_indice_rag_ids_vectores', { synchronize: false }) // Índice GIN se crea manual
  @Column({ type: 'jsonb' })
  ids_vectores: object;

  @Column({ type: 'timestamp' })
  fecha_indexacion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_reindexacion: Date;

  @Column({ type: 'integer', nullable: true })
  duracion_indexacion_ms: number;

  @Column({ type: 'enum', enum: EstadoIndiceRag })
  estado: EstadoIndiceRag;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @OneToOne(() => Documento, (doc) => doc.indiceRag)
  @JoinColumn({ name: 'documento_id' })
  documento: Documento;
}