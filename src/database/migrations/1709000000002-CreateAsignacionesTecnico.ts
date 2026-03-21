import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAsignacionesTecnico1709000000002 implements MigrationInterface {
  name = 'CreateAsignacionesTecnico1709000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "asignaciones_tecnico" (
        "asignacion_id"    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tecnico_id"       UUID NOT NULL,
        "agricultor_id"    UUID NOT NULL,
        "activa"           BOOLEAN NOT NULL DEFAULT true,
        "notas"            TEXT,
        "fecha_asignacion" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_asignaciones_tecnico"
          FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("usuario_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_asignaciones_agricultor"
          FOREIGN KEY ("agricultor_id") REFERENCES "agricultores"("agricultor_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "uq_asignacion_tecnico_agricultor"
          UNIQUE ("tecnico_id", "agricultor_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_asignaciones_tecnico_id"
        ON "asignaciones_tecnico" ("tecnico_id")
        WHERE "activa" = true
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_asignaciones_agricultor_id"
        ON "asignaciones_tecnico" ("agricultor_id")
        WHERE "activa" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "asignaciones_tecnico" CASCADE`);
  }
}
