import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarioRecordatorios1780000000002 implements MigrationInterface {
    name = 'CreateCalendarioRecordatorios1780000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "estado_recordatorio_enum" AS ENUM (
                'pendiente', 'enviado', 'cancelado', 'fallido'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "calendario_recordatorios" (
                "recordatorio_id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "actividad_id"      UUID,
                "usuario_id"        UUID NOT NULL,
                "parcela_id"        UUID,
                "titulo"            VARCHAR(200) NOT NULL,
                "descripcion"       TEXT,
                "fecha_actividad"   TIMESTAMP NOT NULL,
                "tipo_recordatorio" VARCHAR(10) NOT NULL DEFAULT '24h',
                "fecha_envio"       TIMESTAMP NOT NULL,
                "estado"            "estado_recordatorio_enum" NOT NULL DEFAULT 'pendiente',
                "canal"             VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
                "enviado_en"        TIMESTAMP,
                "creado_en"         TIMESTAMP NOT NULL DEFAULT NOW(),
                "actualizado_en"    TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT "fk_recordatorio_usuario"
                    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id")
                    ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_recordatorios_fecha_envio"
            ON "calendario_recordatorios" ("fecha_envio", "estado")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "calendario_recordatorios"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "estado_recordatorio_enum"`);
    }
}