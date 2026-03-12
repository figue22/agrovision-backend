import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';

@Entity('agricultores')
export class Agricultor {
  @PrimaryGeneratedColumn('uuid')
  agricultor_id: string;

  @Column({ type: 'uuid', unique: true })
  usuario_id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  cedula: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ type: 'varchar', length: 100 })
  municipio: string;

  @Column({ type: 'varchar', length: 100 })
  departamento: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tamano_finca_ha: number;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  // ── Relaciones ──

  @OneToOne(() => Usuario, (usuario) => usuario.agricultor)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany(() => Parcela, (parcela) => parcela.agricultor)
  parcelas: Parcela[];
}