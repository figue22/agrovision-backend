import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeatherIndex1778800000000 implements MigrationInterface {
  name = 'AddWeatherIndex1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_datos_climaticos_parcela_fecha"
      ON "datos_climaticos" ("parcela_id", "fecha")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_datos_climaticos_parcela_fecha_fuente"
      ON "datos_climaticos" ("parcela_id", "fecha", "fuente")
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    await _queryRunner.query(`DROP INDEX IF EXISTS "IDX_datos_climaticos_parcela_fecha_fuente"`);
    await _queryRunner.query(`DROP INDEX IF EXISTS "IDX_datos_climaticos_parcela_fecha"`);
  }
}