import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBotPausadoToSesionesWhatsapp1780000000003 implements MigrationInterface {
    name = 'AddBotPausadoToSesionesWhatsapp1780000000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sesiones_whatsapp"
            ADD COLUMN IF NOT EXISTS "bot_pausado" boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "bot_pausado_hasta" TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sesiones_whatsapp"
            DROP COLUMN IF EXISTS "bot_pausado",
            DROP COLUMN IF EXISTS "bot_pausado_hasta"
        `);
    }
}