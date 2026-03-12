import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';


import { TipoSuelo } from '../../../../common/enums/enums';;
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { Actividad } from '@modules/activities/domain/entities/actividad.entity';
import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { Documento } from '@modules/documents/domain/entities/documento.entity';

@Entity('parcelas')
export class Parcela {
  @PrimaryGeneratedColumn('uuid')
  parcela_id: string;

  @Column({ type: 'uuid' })
  agricultor_id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  // PostGIS GEOGRAPHY(POINT, 4326) — se maneja como geometría con índice GiST
  @Index('idx_parcelas_ubicacion', { spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  ubicacion: object;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  area_hectareas: number;

  @Column({ type: 'enum', enum: TipoSuelo, nullable: true })
  tipo_suelo: TipoSuelo;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  ph_suelo: number;

  @Column({ type: 'integer', nullable: true })
  altitud_msnm: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  limites_geojson: object;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  // ── Relaciones ──

  @ManyToOne(() => Agricultor, (agricultor) => agricultor.parcelas)
  @JoinColumn({ name: 'agricultor_id' })
  agricultor: Agricultor;

  @OneToMany(() => CultivoParcela, (cultivo) => cultivo.parcela)
  cultivosParcela: CultivoParcela[];

  @OneToMany(() => Actividad, (actividad) => actividad.parcela)
  actividades: Actividad[];

  @OneToMany(() => DatoClimatico, (dato) => dato.parcela)
  datosClimaticos: DatoClimatico[];

  @OneToMany(() => Prediccion, (prediccion) => prediccion.parcela)
  predicciones: Prediccion[];

  @OneToMany(() => Alerta, (alerta) => alerta.parcela)
  alertas: Alerta[];

  @OneToMany(() => Documento, (documento) => documento.parcela)
  documentos: Documento[];
}