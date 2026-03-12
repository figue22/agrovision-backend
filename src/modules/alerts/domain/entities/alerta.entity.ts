import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Severidad } from '../../../../common/enums/enums';;
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { CatTipoAlerta } from '@modules/catalogs/domain/entities/cat-tipo-alerta.entity';

// Índice parcial se crea en migración SQL:
// CREATE INDEX idx_alertas_usuario_no_leidas ON alertas (usuario_id, esta_leida) WHERE esta_leida = false;
@Entity('alertas')
export class Alerta {
  @PrimaryGeneratedColumn('uuid')
  alerta_id: string;

  @Column({ type: 'uuid', nullable: true })
  parcela_id: string;

  @Column({ type: 'uuid' })
  usuario_id: string;

  @Column({ type: 'integer' })
  tipo_alerta_id: number;

  @Column({ type: 'enum', enum: Severidad })
  severidad: Severidad;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'text', nullable: true })
  accion_requerida: string;

  @Column({ type: 'boolean', default: false })
  esta_leida: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fecha_lectura: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  canales_enviados: string;

  @Column({ type: 'timestamp', nullable: true })
  expira_en: Date;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Parcela, (parcela) => parcela.alertas, { nullable: true })
  @JoinColumn({ name: 'parcela_id' })
  parcela: Parcela;

  @ManyToOne(() => Usuario, (usuario) => usuario.alertas)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => CatTipoAlerta, (tipo) => tipo.alertas)
  @JoinColumn({ name: 'tipo_alerta_id' })
  tipoAlerta: CatTipoAlerta;
}