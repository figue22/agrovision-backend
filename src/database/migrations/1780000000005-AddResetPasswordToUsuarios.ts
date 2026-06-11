import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetPasswordToUsuarios1780000000005 implements MigrationInterface {
  name = 'AddResetPasswordToUsuarios1780000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "reset_password_token" VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS "reset_password_expires" TIMESTAMP NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_usuarios_reset_token"
      ON "usuarios" ("reset_password_token")
      WHERE "reset_password_token" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usuarios_reset_token"`);
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN IF EXISTS "reset_password_token",
      DROP COLUMN IF EXISTS "reset_password_expires"
    `);
  }
}