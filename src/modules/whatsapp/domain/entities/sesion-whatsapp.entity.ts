import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EstadoRegistroWhatsapp } from '../../../../common/enums/enums';;
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@Entity('sesiones_whatsapp')
@Index('idx_sesiones_wa_ultima_interaccion', ['ultima_interaccion'])
export class SesionWhatsapp {
  @PrimaryGeneratedColumn('uuid')
  sesion_wa_id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  wa_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombre_mostrado: string;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string;

  @Column({ type: 'enum', enum: EstadoRegistroWhatsapp })
  estado_registro: EstadoRegistroWhatsapp;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'es' })
  idioma_preferido: string;

  @Column({ type: 'jsonb', nullable: true })
  contexto_sesion: object;

  @Column({ type: 'timestamp' })
  primera_interaccion: Date;

  @Column({ type: 'timestamp' })
  ultima_interaccion: Date;

  @Column({ type: 'boolean', default: false })
  esta_bloqueado: boolean;

  @Column({ type: 'text', nullable: true })
  razon_bloqueo: string;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Usuario, (usuario) => usuario.sesionesWhatsapp, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}