import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCultivoParcelaToActividades1779000000000 implements MigrationInterface {
  name = 'AddCultivoParcelaToActividades1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "cultivo_parcela_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "actividades" ADD CONSTRAINT "FK_actividades_cultivo_parcela"
       FOREIGN KEY ("cultivo_parcela_id") REFERENCES "cultivos_parcela"("cultivo_parcela_id") ON DELETE SET NULL`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    await _queryRunner.query(`ALTER TABLE "actividades" DROP CONSTRAINT IF EXISTS "FK_actividades_cultivo_parcela"`);
    await _queryRunner.query(`ALTER TABLE "actividades" DROP COLUMN IF EXISTS "cultivo_parcela_id"`);
  }
}