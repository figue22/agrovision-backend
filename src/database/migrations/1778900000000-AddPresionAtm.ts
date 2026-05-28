import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPresionAtm1778900000000 implements MigrationInterface {
  name = 'AddPresionAtm1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "datos_climaticos" ADD COLUMN IF NOT EXISTS "presion_atm" decimal(7,2)`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    await _queryRunner.query(
      `ALTER TABLE "datos_climaticos" DROP COLUMN IF EXISTS "presion_atm"`,
    );
  }
}