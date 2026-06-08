import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum EstadoRecordatorio {
    PENDIENTE = 'pendiente',
    ENVIADO = 'enviado',
    CANCELADO = 'cancelado',
    FALLIDO = 'fallido',
}

@Entity('calendario_recordatorios')
export class Recordatorio {
    @PrimaryGeneratedColumn('uuid')
    recordatorio_id: string;

    @Column({ type: 'uuid', nullable: true })
    actividad_id: string;

    @Column({ type: 'uuid' })
    usuario_id: string;

    @Column({ type: 'uuid', nullable: true })
    parcela_id: string;

    @Column({ type: 'varchar', length: 200 })
    titulo: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ type: 'timestamp' })
    fecha_actividad: Date;

    @Column({ type: 'varchar', length: 10, default: '24h' })
    tipo_recordatorio: string;

    @Column({ type: 'timestamp' })
    fecha_envio: Date;

    @Column({ type: 'varchar', default: 'pendiente' })
    estado: string;

    @Column({ type: 'varchar', length: 20, default: 'whatsapp' })
    canal: string;

    @Column({ type: 'timestamp', nullable: true })
    enviado_en: Date;

    @CreateDateColumn()
    creado_en: Date;

    @UpdateDateColumn()
    actualizado_en: Date;
}