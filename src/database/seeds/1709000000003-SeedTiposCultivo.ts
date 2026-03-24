import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTiposCultivo1709000000003 implements MigrationInterface {
  name = 'SeedTiposCultivo1709000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "tipos_cultivo" (
        "tipo_cultivo_id", "nombre", "nombre_cientifico", "categoria",
        "dias_crecimiento_prom", "temp_optima_min", "temp_optima_max",
        "altitud_optima_min", "altitud_optima_max",
        "ph_optimo_min", "ph_optimo_max", "req_agua"
      ) VALUES
      (
        gen_random_uuid(),
        'Plátano',
        'Musa paradisiaca',
        'fruta',
        300,
        22.0, 30.0,
        0, 1500,
        5.5, 7.0,
        'alto'
      ),
      (
        gen_random_uuid(),
        'Cacao',
        'Theobroma cacao',
        'fruta',
        365,
        20.0, 30.0,
        0, 800,
        5.5, 7.5,
        'alto'
      )
      ON CONFLICT (nombre) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "tipos_cultivo" WHERE "nombre" IN ('Plátano', 'Cacao')
    `);
  }
}
