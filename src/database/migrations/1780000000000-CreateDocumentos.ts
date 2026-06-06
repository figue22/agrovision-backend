import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChunksToDocumentos1780000000000 implements MigrationInterface {
    name = 'AddChunksToDocumentos1780000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "documentos"
            ADD COLUMN IF NOT EXISTS "chunks_indexados" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "fecha_indexacion" TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "documentos"
            DROP COLUMN IF EXISTS "chunks_indexados",
            DROP COLUMN IF EXISTS "fecha_indexacion"
        `);
    }
}