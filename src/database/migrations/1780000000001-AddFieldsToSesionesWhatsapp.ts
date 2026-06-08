import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldsToSesionesWhatsapp1780000000001 implements MigrationInterface {
    name = 'AddFieldsToSesionesWhatsapp1780000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sesiones_whatsapp"
            ADD COLUMN IF NOT EXISTS "numero_telefono" varchar(20),
            ADD COLUMN IF NOT EXISTS "ultimo_intent" varchar(50),
            ADD COLUMN IF NOT EXISTS "mensajes_enviados" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "mensajes_recibidos" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "nivel_satisfaccion" float,
            ADD COLUMN IF NOT EXISTS "total_consultas_rag" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "total_predicciones" integer NOT NULL DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sesiones_whatsapp"
            DROP COLUMN IF EXISTS "numero_telefono",
            DROP COLUMN IF EXISTS "ultimo_intent",
            DROP COLUMN IF EXISTS "mensajes_enviados",
            DROP COLUMN IF EXISTS "mensajes_recibidos",
            DROP COLUMN IF EXISTS "nivel_satisfaccion",
            DROP COLUMN IF EXISTS "total_consultas_rag",
            DROP COLUMN IF EXISTS "total_predicciones"
        `);
    }
}