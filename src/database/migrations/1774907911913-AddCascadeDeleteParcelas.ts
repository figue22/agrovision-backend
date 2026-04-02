import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteParcelas1774907911913 implements MigrationInterface {
    name = 'AddCascadeDeleteParcelas1774907911913'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documentos" DROP CONSTRAINT "FK_401af25ec63a6b91e8ab8e655d9"`);
        await queryRunner.query(`ALTER TABLE "predicciones" DROP CONSTRAINT "FK_f00b9909ac7a537ed9c7024e772"`);
        await queryRunner.query(`ALTER TABLE "actividades" DROP CONSTRAINT "FK_8c8be0b09e7323739e1e2001afb"`);
        await queryRunner.query(`ALTER TABLE "datos_climaticos" DROP CONSTRAINT "FK_424cc74bd6408877fc0f0ea2ca1"`);
        await queryRunner.query(`ALTER TABLE "alertas" DROP CONSTRAINT "FK_e56f6b00ec7e69a065bfa6d569c"`);
        await queryRunner.query(`ALTER TABLE "documentos" ADD CONSTRAINT "FK_401af25ec63a6b91e8ab8e655d9" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "predicciones" ADD CONSTRAINT "FK_f00b9909ac7a537ed9c7024e772" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "actividades" ADD CONSTRAINT "FK_8c8be0b09e7323739e1e2001afb" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "datos_climaticos" ADD CONSTRAINT "FK_424cc74bd6408877fc0f0ea2ca1" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alertas" ADD CONSTRAINT "FK_e56f6b00ec7e69a065bfa6d569c" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alertas" DROP CONSTRAINT "FK_e56f6b00ec7e69a065bfa6d569c"`);
        await queryRunner.query(`ALTER TABLE "datos_climaticos" DROP CONSTRAINT "FK_424cc74bd6408877fc0f0ea2ca1"`);
        await queryRunner.query(`ALTER TABLE "actividades" DROP CONSTRAINT "FK_8c8be0b09e7323739e1e2001afb"`);
        await queryRunner.query(`ALTER TABLE "predicciones" DROP CONSTRAINT "FK_f00b9909ac7a537ed9c7024e772"`);
        await queryRunner.query(`ALTER TABLE "documentos" DROP CONSTRAINT "FK_401af25ec63a6b91e8ab8e655d9"`);
        await queryRunner.query(`ALTER TABLE "alertas" ADD CONSTRAINT "FK_e56f6b00ec7e69a065bfa6d569c" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "datos_climaticos" ADD CONSTRAINT "FK_424cc74bd6408877fc0f0ea2ca1" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "actividades" ADD CONSTRAINT "FK_8c8be0b09e7323739e1e2001afb" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "predicciones" ADD CONSTRAINT "FK_f00b9909ac7a537ed9c7024e772" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documentos" ADD CONSTRAINT "FK_401af25ec63a6b91e8ab8e655d9" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
