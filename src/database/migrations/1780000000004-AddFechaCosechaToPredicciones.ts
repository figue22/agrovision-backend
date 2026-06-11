import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFechaCosechaToPredicciones1780000000004 implements MigrationInterface {
    name = 'AddFechaCosechaToPredicciones1780000000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "predicciones"
            ADD COLUMN IF NOT EXISTS "fecha_cosecha_estimada" TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "dias_para_cosecha" INTEGER
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "predicciones"
            DROP COLUMN IF EXISTS "fecha_cosecha_estimada",
            DROP COLUMN IF EXISTS "dias_para_cosecha"
        `);
    }
}