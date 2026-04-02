import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { EstadoIndexacion } from '../../../../common/enums/enums';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { IndiceRagDocumento } from '@modules/documents/domain/entities/indice-rag-documento.entity';
import { Recomendacion } from '@modules/recommendations/domain/entities/recomendacion.entity';

// Índice parcial se crea en migración SQL:
// CREATE INDEX idx_documentos_estado_pendiente ON documentos (estado_indexacion) WHERE estado_indexacion = 'pendiente';
@Entity('documentos')
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  documento_id: string;

  @Column({ type: 'uuid', nullable: true })
  parcela_id: string;

  @Column({ type: 'uuid', nullable: true })
  subido_por_id: string;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'varchar', length: 100 })
  categoria: string;

  @Column({ type: 'varchar', length: 500 })
  ruta_archivo: string;

  @Column({ type: 'varchar', length: 20 })
  tipo_archivo: string;

  @Column({ type: 'integer', nullable: true })
  tamano_kb: number;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'es' })
  idioma: string;

  @Column({ type: 'enum', enum: EstadoIndexacion })
  estado_indexacion: EstadoIndexacion;

  @Column({ type: 'boolean', default: true })
  esta_activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Parcela, (parcela) => parcela.documentos, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcela_id' })
  parcela: Parcela;

  @ManyToOne(() => Usuario, (usuario) => usuario.documentos, { nullable: true})
  @JoinColumn({ name: 'subido_por_id' })
  subidoPor: Usuario;

  @OneToOne(() => IndiceRagDocumento, (indice) => indice.documento)
  indiceRag: IndiceRagDocumento;

  @OneToMany(() => Recomendacion, (rec) => rec.documentoFuente)
  recomendaciones: Recomendacion[];
}