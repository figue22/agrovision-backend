import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@Entity('logs_auditoria')
export class LogAuditoria {
  @PrimaryGeneratedColumn('uuid')
  log_id: string;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string;

  @Column({ type: 'varchar', length: 50 })
  accion: string;

  @Column({ type: 'varchar', length: 50 })
  tipo_entidad: string;

  @Column({ type: 'uuid', nullable: true })
  id_entidad: string;

  @Column({ type: 'jsonb', nullable: true })
  valores_anteriores: object;

  @Column({ type: 'jsonb', nullable: true })
  valores_nuevos: object;

  @Column({ type: 'inet', nullable: true })
  direccion_ip: string;

  @Column({ type: 'text', nullable: true })
  agente_usuario: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  metodo_http: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  ruta_endpoint: string;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Usuario, (usuario) => usuario.logsAuditoria, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}