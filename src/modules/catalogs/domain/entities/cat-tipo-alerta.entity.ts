import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';

@Entity('cat_tipos_alerta')
export class CatTipoAlerta {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // ── Relaciones ──

  @OneToMany(() => Alerta, (alerta) => alerta.tipoAlerta)
  alertas: Alerta[];
}