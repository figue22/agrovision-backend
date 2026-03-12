import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Rol } from '../../../../common/enums/enums';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';
import { Documento } from '@modules/documents/domain/entities/documento.entity';
import { LogAuditoria } from '@modules/audit/domain/entities/log-auditoria.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  usuario_id: string;

  // Índice funcional LOWER(correo) se crea en migración SQL:
  // CREATE UNIQUE INDEX idx_usuarios_correo_lower ON usuarios (LOWER(correo));
  @Column({ type: 'varchar', length: 255, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 255 })
  contrasena_hash: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  apellido: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'enum', enum: Rol })
  rol: Rol;

  @Column({ type: 'varchar', length: 255, nullable: true })
  totp_secret: string;

  @Column({ type: 'boolean', default: false })
  tiene_2fa: boolean;

  @Column({ type: 'boolean', default: true })
  esta_activo: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_login: Date;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  // ── Relaciones ──

  @OneToOne(() => Agricultor, (agricultor) => agricultor.usuario)
  agricultor: Agricultor;

  @OneToMany(() => Actividad, (actividad) => actividad.realizadaPor)
  actividades: Actividad[];

  @OneToMany(() => Alerta, (alerta) => alerta.usuario)
  alertas: Alerta[];

  @OneToMany(() => SesionWhatsapp, (sesion) => sesion.usuario)
  sesionesWhatsapp: SesionWhatsapp[];

  @OneToMany(() => Documento, (documento) => documento.subidoPor)
  documentos: Documento[];

  @OneToMany(() => LogAuditoria, (log) => log.usuario)
  logsAuditoria: LogAuditoria[];
}