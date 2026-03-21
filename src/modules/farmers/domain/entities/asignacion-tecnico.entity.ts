import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';

@Entity('asignaciones_tecnico')
@Unique('uq_asignacion_tecnico_agricultor', ['tecnico_id', 'agricultor_id'])
export class AsignacionTecnico {
  @PrimaryGeneratedColumn('uuid')
  asignacion_id: string;

  @Column({ type: 'uuid' })
  tecnico_id: string;

  @Column({ type: 'uuid' })
  agricultor_id: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_asignacion: Date;

  // ── Relaciones ──

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'tecnico_id' })
  tecnico: Usuario;

  @ManyToOne(() => Agricultor)
  @JoinColumn({ name: 'agricultor_id' })
  agricultor: Agricultor;
}
