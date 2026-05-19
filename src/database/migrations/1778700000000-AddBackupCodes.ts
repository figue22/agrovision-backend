import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBackupCodes1778700000000 implements MigrationInterface {
  name = 'AddBackupCodes1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "backup_codes" text`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No revertir
  }
}