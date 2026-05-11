import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeDeleteParcelas1774907911913 implements MigrationInterface {
  name = 'AddCascadeDeleteParcelas1774907911913';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      { table: 'cultivos_parcela', column: 'parcela_id', ref: 'parcelas' },
      { table: 'actividades', column: 'parcela_id', ref: 'parcelas' },
      { table: 'datos_climaticos', column: 'parcela_id', ref: 'parcelas' },
      { table: 'predicciones', column: 'parcela_id', ref: 'parcelas' },
      { table: 'alertas', column: 'parcela_id', ref: 'parcelas' },
      { table: 'documentos', column: 'parcela_id', ref: 'parcelas' },
    ];

    for (const { table, column, ref } of tables) {
      const fks = await queryRunner.query(`
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = '${table}'
          AND att.attname = '${column}'
          AND con.contype = 'f'
      `);

      if (fks.length > 0) {
        const fkName = fks[0].conname;
        await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${fkName}"`);
        await queryRunner.query(
          `ALTER TABLE "${table}" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("${column}") REFERENCES "${ref}"("parcela_id") ON DELETE CASCADE`
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No es necesario revertir
  }
}