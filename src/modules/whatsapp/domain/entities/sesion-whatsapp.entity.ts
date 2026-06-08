import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { EstadoRegistroWhatsapp } from '../../../../common/enums/enums';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@Entity('sesiones_whatsapp')
@Index('idx_sesiones_wa_ultima_interaccion', ['ultima_interaccion'])
export class SesionWhatsapp {
  @PrimaryGeneratedColumn('uuid')
  sesion_wa_id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  wa_id: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numero_telefono: string;

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

  @Column({ type: 'varchar', length: 50, nullable: true })
  ultimo_intent: string;

  @Column({ type: 'integer', default: 0 })
  mensajes_enviados: number;

  @Column({ type: 'integer', default: 0 })
  mensajes_recibidos: number;

  @Column({ type: 'float', nullable: true })
  nivel_satisfaccion: number;

  @Column({ type: 'integer', default: 0 })
  total_consultas_rag: number;

  @Column({ type: 'integer', default: 0 })
  total_predicciones: number;

  @Column({ type: 'timestamp' })
  primera_interaccion: Date;

  @Column({ type: 'timestamp' })
  ultima_interaccion: Date;

  @Column({ type: 'boolean', default: false })
  esta_bloqueado: boolean;

  @Column({ type: 'text', nullable: true })
  razon_bloqueo: string;

  @Column({ type: 'boolean', default: false })
  bot_pausado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  bot_pausado_hasta: Date;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.sesionesWhatsapp, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}