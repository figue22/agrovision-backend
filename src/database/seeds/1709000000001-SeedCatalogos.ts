import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCatalogos1709000000001 implements MigrationInterface {
  name = 'SeedCatalogos1709000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ════════════════════════════════════════════
    // CAT_TIPOS_ACTIVIDAD
    // Valores iniciales: siembra, riego, fertilización,
    // fumigación, cosecha, poda, otro
    // ════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "cat_tipos_actividad" ("codigo", "nombre", "descripcion") VALUES
        ('siembra',       'Siembra',        'Actividad de siembra de semillas o plántulas en la parcela'),
        ('riego',         'Riego',          'Aplicación de agua al cultivo mediante cualquier método de irrigación'),
        ('fertilizacion', 'Fertilización',  'Aplicación de fertilizantes orgánicos o químicos al suelo o follaje'),
        ('fumigacion',    'Fumigación',     'Aplicación de productos fitosanitarios para control de plagas o enfermedades'),
        ('cosecha',       'Cosecha',        'Recolección del producto agrícola maduro o en punto de corte'),
        ('poda',          'Poda',           'Corte selectivo de ramas, hojas o frutos para mejorar el desarrollo del cultivo'),
        ('otro',          'Otro',           'Actividad agrícola no clasificada en las categorías anteriores')
    `);

    // ════════════════════════════════════════════
    // CAT_TIPOS_INSUMO
    // Valores iniciales: fertilizante, pesticida,
    // herbicida, semilla, otro
    // ════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "cat_tipos_insumo" ("codigo", "nombre", "descripcion") VALUES
        ('fertilizante', 'Fertilizante', 'Productos para nutrir el suelo o la planta (urea, NPK, abonos orgánicos, etc.)'),
        ('pesticida',    'Pesticida',    'Productos para control de insectos y plagas (insecticidas, acaricidas, etc.)'),
        ('herbicida',    'Herbicida',    'Productos para control de malezas y arvenses no deseadas'),
        ('semilla',      'Semilla',      'Material vegetal de propagación (semillas, plántulas, esquejes)'),
        ('otro',         'Otro',         'Insumo agrícola no clasificado en las categorías anteriores')
    `);

    // ════════════════════════════════════════════
    // CAT_TIPOS_RECOMENDACION
    // Valores iniciales: fertilización, riego,
    // plagas, siembra, cosecha, general
    // ════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "cat_tipos_recomendacion" ("codigo", "nombre", "descripcion") VALUES
        ('fertilizacion', 'Fertilización',  'Recomendaciones sobre tipo, cantidad y momento de aplicación de fertilizantes'),
        ('riego',         'Riego',          'Recomendaciones sobre frecuencia, volumen y método de riego'),
        ('plagas',        'Plagas',         'Recomendaciones para prevención, detección y control de plagas y enfermedades'),
        ('siembra',       'Siembra',        'Recomendaciones sobre época, densidad y método de siembra'),
        ('cosecha',       'Cosecha',        'Recomendaciones sobre momento óptimo y técnicas de cosecha'),
        ('general',       'General',        'Recomendaciones generales de manejo agronómico no clasificadas')
    `);

    // ════════════════════════════════════════════
    // CAT_TIPOS_ALERTA
    // Valores iniciales: helada, sequía, lluvia_fuerte,
    // viento, plaga, recordatorio, sistema
    // ════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "cat_tipos_alerta" ("codigo", "nombre", "descripcion") VALUES
        ('helada',        'Helada',         'Alerta por temperaturas cercanas o inferiores a 0°C que pueden dañar cultivos'),
        ('sequia',        'Sequía',         'Alerta por períodos prolongados sin precipitación que afectan los cultivos'),
        ('lluvia_fuerte', 'Lluvia fuerte',  'Alerta por precipitaciones intensas que pueden causar inundaciones o erosión'),
        ('viento',        'Viento',         'Alerta por vientos fuertes que pueden dañar estructuras o cultivos'),
        ('plaga',         'Plaga',          'Alerta por condiciones climáticas favorables para la aparición de plagas'),
        ('recordatorio',  'Recordatorio',   'Recordatorio de actividades programadas como cosecha, fumigación o riego'),
        ('sistema',       'Sistema',        'Notificaciones internas del sistema como mantenimiento o actualizaciones')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "cat_tipos_alerta"`);
    await queryRunner.query(`DELETE FROM "cat_tipos_recomendacion"`);
    await queryRunner.query(`DELETE FROM "cat_tipos_insumo"`);
    await queryRunner.query(`DELETE FROM "cat_tipos_actividad"`);
  }
}