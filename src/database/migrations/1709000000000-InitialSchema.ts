import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709000000000 implements MigrationInterface {
  name = 'InitialSchema1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ════════════════════════════════════════════
    // 1. EXTENSIONES DE POSTGRESQL
    // ════════════════════════════════════════════
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ════════════════════════════════════════════
    // 2. TIPOS ENUM
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TYPE "rol_enum" AS ENUM ('admin', 'tecnico', 'agricultor')
    `);
    await queryRunner.query(`
      CREATE TYPE "tipo_suelo_enum" AS ENUM ('arcilloso', 'arenoso', 'limoso', 'franco', 'mixto')
    `);
    await queryRunner.query(`
      CREATE TYPE "req_agua_enum" AS ENUM ('bajo', 'medio', 'alto')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_cultivo_enum" AS ENUM ('planificado', 'activo', 'cosechado', 'fallido', 'abandonado')
    `);
    await queryRunner.query(`
      CREATE TYPE "nivel_riesgo_enum" AS ENUM ('bajo', 'medio', 'alto', 'critico')
    `);
    await queryRunner.query(`
      CREATE TYPE "prioridad_enum" AS ENUM ('baja', 'media', 'alta', 'urgente')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_implementacion_enum" AS ENUM ('pendiente', 'en_progreso', 'completada', 'descartada')
    `);
    await queryRunner.query(`
      CREATE TYPE "severidad_enum" AS ENUM ('info', 'baja', 'media', 'alta', 'critica')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_registro_wa_enum" AS ENUM ('desconocido', 'invitado', 'en_proceso', 'registrado', 'rechazado')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_indexacion_enum" AS ENUM ('pendiente', 'procesando', 'indexado', 'fallido', 'excluido')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_indice_rag_enum" AS ENUM ('activo', 'obsoleto', 'reindexando', 'eliminado')
    `);

    // ════════════════════════════════════════════
    // 3. CAPA 1: AUTENTICACIÓN Y USUARIOS
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "usuario_id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "correo"          VARCHAR(255) NOT NULL UNIQUE,
        "contrasena_hash" VARCHAR(255) NOT NULL,
        "nombre"          VARCHAR(100) NOT NULL,
        "apellido"        VARCHAR(100) NOT NULL,
        "telefono"        VARCHAR(20),
        "rol"             rol_enum NOT NULL,
        "totp_secreto"    VARCHAR(255),
        "tiene_2fa"       BOOLEAN NOT NULL DEFAULT false,
        "esta_activo"     BOOLEAN NOT NULL DEFAULT true,
        "ultimo_login"    TIMESTAMP,
        "creado_en"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en"  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "agricultores" (
        "agricultor_id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "usuario_id"      UUID NOT NULL UNIQUE,
        "cedula"          VARCHAR(20) NOT NULL UNIQUE,
        "direccion"       TEXT,
        "municipio"       VARCHAR(100) NOT NULL,
        "departamento"    VARCHAR(100) NOT NULL,
        "tamano_finca_ha" DECIMAL(10,2) CHECK ("tamano_finca_ha" >= 0),
        "creado_en"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en"  TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_agricultores_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 4. CAPA 2: DOMINIO AGRÍCOLA
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "parcelas" (
        "parcela_id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "agricultor_id"   UUID NOT NULL,
        "nombre"          VARCHAR(100) NOT NULL,
        "ubicacion"       GEOGRAPHY(POINT, 4326) NOT NULL,
        "area_hectareas"  DECIMAL(10,2) NOT NULL CHECK ("area_hectareas" > 0),
        "tipo_suelo"      tipo_suelo_enum,
        "ph_suelo"        DECIMAL(3,1) CHECK ("ph_suelo" >= 0 AND "ph_suelo" <= 14),
        "altitud_msnm"    INTEGER CHECK ("altitud_msnm" >= 0),
        "limites_geojson"  GEOGRAPHY(POLYGON, 4326),
        "creado_en"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en"  TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_parcelas_agricultor"
          FOREIGN KEY ("agricultor_id") REFERENCES "agricultores"("agricultor_id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tipos_cultivo" (
        "tipo_cultivo_id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre"                VARCHAR(100) NOT NULL UNIQUE,
        "nombre_cientifico"     VARCHAR(150),
        "categoria"             VARCHAR(50),
        "dias_crecimiento_prom" INTEGER CHECK ("dias_crecimiento_prom" > 0),
        "temp_optima_min"       DECIMAL(5,2),
        "temp_optima_max"       DECIMAL(5,2),
        "altitud_optima_min"    INTEGER,
        "altitud_optima_max"    INTEGER,
        "ph_optimo_min"         DECIMAL(3,1) CHECK ("ph_optimo_min" >= 0 AND "ph_optimo_min" <= 14),
        "ph_optimo_max"         DECIMAL(3,1) CHECK ("ph_optimo_max" >= 0 AND "ph_optimo_max" <= 14),
        "req_agua"              req_agua_enum,
        "creado_en"             TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "chk_tipos_cultivo_temp"
          CHECK ("temp_optima_min" IS NULL OR "temp_optima_max" IS NULL OR "temp_optima_min" < "temp_optima_max"),
        CONSTRAINT "chk_tipos_cultivo_ph"
          CHECK ("ph_optimo_min" IS NULL OR "ph_optimo_max" IS NULL OR "ph_optimo_min" < "ph_optimo_max")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cultivos_parcela" (
        "cultivo_parcela_id"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parcela_id"             UUID NOT NULL,
        "tipo_cultivo_id"        UUID NOT NULL,
        "fecha_siembra"          DATE NOT NULL,
        "fecha_cosecha_esperada" DATE,
        "fecha_cosecha_real"     DATE,
        "area_sembrada_ha"       DECIMAL(10,2) CHECK ("area_sembrada_ha" > 0),
        "rendimiento_esperado_ton" DECIMAL(10,2),
        "rendimiento_real_ton"   DECIMAL(10,2),
        "estado"                 estado_cultivo_enum NOT NULL,
        "temporada"              VARCHAR(20),
        "notas"                  TEXT,
        "creado_en"              TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en"         TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_cultivos_parcela_parcela"
          FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_cultivos_parcela_tipo"
          FOREIGN KEY ("tipo_cultivo_id") REFERENCES "tipos_cultivo"("tipo_cultivo_id")
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "chk_cultivos_parcela_fechas"
          CHECK ("fecha_cosecha_esperada" IS NULL OR "fecha_cosecha_esperada" > "fecha_siembra"),
        CONSTRAINT "chk_cultivos_parcela_fechas_real"
          CHECK ("fecha_cosecha_real" IS NULL OR "fecha_cosecha_real" > "fecha_siembra")
      )
    `);

    // ════════════════════════════════════════════
    // 5. TABLAS CATÁLOGO
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "cat_tipos_actividad" (
        "id"          SERIAL PRIMARY KEY,
        "codigo"      VARCHAR(30) NOT NULL UNIQUE,
        "nombre"      VARCHAR(100) NOT NULL,
        "descripcion" TEXT,
        "activo"      BOOLEAN NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cat_tipos_insumo" (
        "id"          SERIAL PRIMARY KEY,
        "codigo"      VARCHAR(30) NOT NULL UNIQUE,
        "nombre"      VARCHAR(100) NOT NULL,
        "descripcion" TEXT,
        "activo"      BOOLEAN NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cat_tipos_recomendacion" (
        "id"          SERIAL PRIMARY KEY,
        "codigo"      VARCHAR(30) NOT NULL UNIQUE,
        "nombre"      VARCHAR(100) NOT NULL,
        "descripcion" TEXT,
        "activo"      BOOLEAN NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cat_tipos_alerta" (
        "id"          SERIAL PRIMARY KEY,
        "codigo"      VARCHAR(30) NOT NULL UNIQUE,
        "nombre"      VARCHAR(100) NOT NULL,
        "descripcion" TEXT,
        "activo"      BOOLEAN NOT NULL DEFAULT true
      )
    `);

    // ════════════════════════════════════════════
    // 6. ACTIVIDADES E INSUMOS
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "actividades" (
        "actividad_id"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parcela_id"       UUID NOT NULL,
        "realizada_por_id" UUID,
        "tipo_actividad_id" INTEGER NOT NULL,
        "descripcion"      TEXT,
        "cantidad"         DECIMAL(10,2),
        "unidad"           VARCHAR(20),
        "costo_cop"        DECIMAL(12,2) CHECK ("costo_cop" >= 0),
        "adjuntos"         JSONB,
        "fecha_realizacion" DATE NOT NULL,
        "notas"            TEXT,
        "creado_en"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_actividades_parcela"
          FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_actividades_usuario"
          FOREIGN KEY ("realizada_por_id") REFERENCES "usuarios"("usuario_id")
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_actividades_tipo"
          FOREIGN KEY ("tipo_actividad_id") REFERENCES "cat_tipos_actividad"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "insumos_actividad" (
        "insumo_actividad_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actividad_id"        UUID NOT NULL,
        "nombre_insumo"       VARCHAR(150) NOT NULL,
        "tipo_insumo_id"      INTEGER NOT NULL,
        "cantidad"            DECIMAL(10,2) NOT NULL,
        "unidad"              VARCHAR(20) NOT NULL,
        "costo_unitario_cop"  DECIMAL(12,2) CHECK ("costo_unitario_cop" >= 0),
        "marca"               VARCHAR(100),
        "creado_en"           TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_insumos_actividad"
          FOREIGN KEY ("actividad_id") REFERENCES "actividades"("actividad_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_insumos_tipo"
          FOREIGN KEY ("tipo_insumo_id") REFERENCES "cat_tipos_insumo"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 7. CAPA 3: DATOS CLIMÁTICOS
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "datos_climaticos" (
        "dato_climatico_id"  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parcela_id"         UUID NOT NULL,
        "fecha"              DATE NOT NULL,
        "temp_maxima"        DECIMAL(5,2),
        "temp_minima"        DECIMAL(5,2),
        "temp_promedio"      DECIMAL(5,2),
        "precipitacion_mm"   DECIMAL(8,2) CHECK ("precipitacion_mm" >= 0),
        "humedad_pct"        DECIMAL(5,2) CHECK ("humedad_pct" >= 0 AND "humedad_pct" <= 100),
        "velocidad_viento"   DECIMAL(6,2) CHECK ("velocidad_viento" >= 0),
        "indice_uv"          DECIMAL(4,1) CHECK ("indice_uv" >= 0),
        "cobertura_nubes_pct" DECIMAL(5,2) CHECK ("cobertura_nubes_pct" >= 0 AND "cobertura_nubes_pct" <= 100),
        "fuente"             VARCHAR(50) NOT NULL,
        "datos_crudos"       JSONB,
        "creado_en"          TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_datos_climaticos_parcela_fecha_fuente"
          UNIQUE ("parcela_id", "fecha", "fuente"),
        CONSTRAINT "fk_datos_climaticos_parcela"
          FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 8. CAPA 4: PREDICCIONES ML
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "predicciones" (
        "prediccion_id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parcela_id"              UUID NOT NULL,
        "cultivo_parcela_id"      UUID,
        "tipo_cultivo_id"         UUID NOT NULL,
        "version_modelo"          VARCHAR(20) NOT NULL,
        "tipo_modelo"             VARCHAR(30) NOT NULL,
        "rendimiento_predicho_ton" DECIMAL(10,2) NOT NULL,
        "puntaje_confianza"       DECIMAL(5,2) CHECK ("puntaje_confianza" >= 0 AND "puntaje_confianza" <= 100),
        "intervalo_conf_inferior" DECIMAL(10,2),
        "intervalo_conf_superior" DECIMAL(10,2),
        "nivel_riesgo"            nivel_riesgo_enum NOT NULL,
        "factores_riesgo"         JSONB,
        "datos_clima_usados"      JSONB,
        "importancia_features"    JSONB,
        "fecha_prediccion"        TIMESTAMP NOT NULL,
        "creado_en"               TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_predicciones_parcela"
          FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_predicciones_cultivo_parcela"
          FOREIGN KEY ("cultivo_parcela_id") REFERENCES "cultivos_parcela"("cultivo_parcela_id")
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_predicciones_tipo_cultivo"
          FOREIGN KEY ("tipo_cultivo_id") REFERENCES "tipos_cultivo"("tipo_cultivo_id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 9. CAPA 5: DOCUMENTOS Y RAG
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "documentos" (
        "documento_id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parcela_id"        UUID,
        "subido_por_id"     UUID,
        "titulo"            VARCHAR(200) NOT NULL,
        "categoria"         VARCHAR(100) NOT NULL,
        "ruta_archivo"      VARCHAR(500) NOT NULL,
        "tipo_archivo"      VARCHAR(20) NOT NULL,
        "tamano_kb"         INTEGER CHECK ("tamano_kb" > 0),
        "idioma"            VARCHAR(10) DEFAULT 'es',
        "estado_indexacion" estado_indexacion_enum NOT NULL,
        "esta_activo"       BOOLEAN NOT NULL DEFAULT true,
        "creado_en"         TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en"    TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_documentos_parcela"
          FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id")
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_documentos_usuario"
          FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("usuario_id")
          ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recomendaciones" (
        "recomendacion_id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "prediccion_id"         UUID NOT NULL,
        "documento_fuente_id"   UUID,
        "tipo_recomendacion_id" INTEGER NOT NULL,
        "prioridad"             prioridad_enum NOT NULL,
        "titulo"                VARCHAR(200) NOT NULL,
        "descripcion"           TEXT NOT NULL,
        "estado_implementacion" estado_implementacion_enum NOT NULL DEFAULT 'pendiente',
        "fecha_implementacion"  TIMESTAMP,
        "feedback_agricultor"   TEXT,
        "calificacion_eficacia" INTEGER CHECK ("calificacion_eficacia" >= 1 AND "calificacion_eficacia" <= 5),
        "creado_en"             TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_recomendaciones_prediccion"
          FOREIGN KEY ("prediccion_id") REFERENCES "predicciones"("prediccion_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_recomendaciones_documento"
          FOREIGN KEY ("documento_fuente_id") REFERENCES "documentos"("documento_id")
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_recomendaciones_tipo"
          FOREIGN KEY ("tipo_recomendacion_id") REFERENCES "cat_tipos_recomendacion"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "indice_rag_documentos" (
        "indice_rag_id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "documento_id"           UUID NOT NULL UNIQUE,
        "nombre_coleccion"       VARCHAR(100) NOT NULL,
        "cantidad_chunks"        INTEGER NOT NULL,
        "tamano_chunk_tokens"    INTEGER DEFAULT 512,
        "overlap_tokens"         INTEGER DEFAULT 50,
        "modelo_embedding"       VARCHAR(100) NOT NULL,
        "dimensiones_embedding"  INTEGER NOT NULL,
        "ids_vectores"           JSONB NOT NULL,
        "fecha_indexacion"       TIMESTAMP NOT NULL,
        "fecha_reindexacion"     TIMESTAMP,
        "duracion_indexacion_ms" INTEGER,
        "estado"                 estado_indice_rag_enum NOT NULL,
        "creado_en"              TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_indice_rag_documento"
          FOREIGN KEY ("documento_id") REFERENCES "documentos"("documento_id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 10. CAPA 5: ALERTAS Y NOTIFICACIONES
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "alertas" (
        "alerta_id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parcela_id"       UUID,
        "usuario_id"       UUID NOT NULL,
        "tipo_alerta_id"   INTEGER NOT NULL,
        "severidad"        severidad_enum NOT NULL,
        "titulo"           VARCHAR(200) NOT NULL,
        "mensaje"          TEXT NOT NULL,
        "accion_requerida" TEXT,
        "esta_leida"       BOOLEAN NOT NULL DEFAULT false,
        "fecha_lectura"    TIMESTAMP,
        "canales_enviados" VARCHAR(100),
        "expira_en"        TIMESTAMP,
        "creado_en"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_alertas_parcela"
          FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("parcela_id")
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_alertas_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_alertas_tipo"
          FOREIGN KEY ("tipo_alerta_id") REFERENCES "cat_tipos_alerta"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 11. CAPA 6: WHATSAPP
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "sesiones_whatsapp" (
        "sesion_wa_id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "wa_id"              VARCHAR(20) NOT NULL UNIQUE,
        "nombre_mostrado"    VARCHAR(100),
        "usuario_id"         UUID,
        "estado_registro"    estado_registro_wa_enum NOT NULL,
        "idioma_preferido"   VARCHAR(10) DEFAULT 'es',
        "contexto_sesion"    JSONB,
        "primera_interaccion" TIMESTAMP NOT NULL,
        "ultima_interaccion" TIMESTAMP NOT NULL,
        "esta_bloqueado"     BOOLEAN NOT NULL DEFAULT false,
        "razon_bloqueo"      TEXT,
        "creado_en"          TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en"     TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_sesiones_wa_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id")
          ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 12. CAPA 8: AUDITORÍA
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "logs_auditoria" (
        "log_id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "usuario_id"         UUID,
        "accion"             VARCHAR(50) NOT NULL,
        "tipo_entidad"       VARCHAR(50) NOT NULL,
        "id_entidad"         UUID,
        "valores_anteriores" JSONB,
        "valores_nuevos"     JSONB,
        "direccion_ip"       INET,
        "agente_usuario"     TEXT,
        "metodo_http"        VARCHAR(10),
        "ruta_endpoint"      VARCHAR(500),
        "creado_en"          TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_logs_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id")
          ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // ════════════════════════════════════════════
    // 13. ÍNDICES SOPORTADOS POR TYPEORM
    // ════════════════════════════════════════════
    // Índice espacial GiST para ubicación de parcelas
    await queryRunner.query(`
      CREATE INDEX "idx_parcelas_ubicacion" ON "parcelas" USING GiST ("ubicacion")
    `);

    // Índice compuesto: actividades por parcela y fecha
    await queryRunner.query(`
      CREATE INDEX "idx_actividades_parcela_fecha"
        ON "actividades" ("parcela_id", "fecha_realizacion" DESC)
    `);

    // Índice compuesto: datos climáticos por parcela y fecha
    await queryRunner.query(`
      CREATE INDEX "idx_datos_climaticos_parcela_fecha"
        ON "datos_climaticos" ("parcela_id", "fecha" DESC)
    `);

    // Índice compuesto: predicciones por parcela y fecha
    await queryRunner.query(`
      CREATE INDEX "idx_predicciones_parcela_fecha"
        ON "predicciones" ("parcela_id", "fecha_prediccion" DESC)
    `);

    // Índice: cultivos parcela por estado activo
    await queryRunner.query(`
      CREATE INDEX "idx_cultivos_parcela_estado"
        ON "cultivos_parcela" ("estado")
    `);

    // Índice: sesiones WhatsApp por última interacción
    await queryRunner.query(`
      CREATE INDEX "idx_sesiones_wa_ultima_interaccion"
        ON "sesiones_whatsapp" ("ultima_interaccion" DESC)
    `);

    // Índice GIN para vectores RAG
    await queryRunner.query(`
      CREATE INDEX "idx_indice_rag_ids_vectores"
        ON "indice_rag_documentos" USING GIN ("ids_vectores")
    `);

    // ════════════════════════════════════════════
    // 14. ÍNDICES MANUALES (no soportados por TypeORM)
    // ════════════════════════════════════════════
    // Índice funcional: búsqueda de correo case-insensitive
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_usuarios_correo_lower"
        ON "usuarios" (LOWER("correo"))
    `);

    // Índice parcial: alertas no leídas por usuario
    await queryRunner.query(`
      CREATE INDEX "idx_alertas_usuario_no_leidas"
        ON "alertas" ("usuario_id", "esta_leida")
        WHERE "esta_leida" = false
    `);

    // Índice parcial: documentos pendientes de indexación
    await queryRunner.query(`
      CREATE INDEX "idx_documentos_estado_pendiente"
        ON "documentos" ("estado_indexacion")
        WHERE "estado_indexacion" = 'pendiente'
    `);

    // ════════════════════════════════════════════
    // 15. TRIGGER: actualizar_updated_at
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION actualizar_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."actualizado_en" = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    const tablasConUpdatedAt = [
      'usuarios',
      'agricultores',
      'parcelas',
      'cultivos_parcela',
      'documentos',
      'sesiones_whatsapp',
    ];

    for (const tabla of tablasConUpdatedAt) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${tabla}_updated_at"
          BEFORE UPDATE ON "${tabla}"
          FOR EACH ROW
          EXECUTE FUNCTION actualizar_updated_at()
      `);
    }

    // ════════════════════════════════════════════
    // 16. REGLA: logs_auditoria append-only
    // ════════════════════════════════════════════
    await queryRunner.query(`
      CREATE RULE "rule_logs_no_update" AS
        ON UPDATE TO "logs_auditoria"
        DO INSTEAD NOTHING
    `);

    await queryRunner.query(`
      CREATE RULE "rule_logs_no_delete" AS
        ON DELETE TO "logs_auditoria"
        DO INSTEAD NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reglas append-only
    await queryRunner.query(`DROP RULE IF EXISTS "rule_logs_no_delete" ON "logs_auditoria"`);
    await queryRunner.query(`DROP RULE IF EXISTS "rule_logs_no_update" ON "logs_auditoria"`);

    // Triggers
    const tablasConUpdatedAt = [
      'usuarios', 'agricultores', 'parcelas',
      'cultivos_parcela', 'documentos', 'sesiones_whatsapp',
    ];
    for (const tabla of tablasConUpdatedAt) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_${tabla}_updated_at" ON "${tabla}"`);
    }
    await queryRunner.query(`DROP FUNCTION IF EXISTS actualizar_updated_at()`);

    // Tablas (orden inverso por dependencias FK)
    await queryRunner.query(`DROP TABLE IF EXISTS "logs_auditoria" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sesiones_whatsapp" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alertas" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "indice_rag_documentos" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recomendaciones" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documentos" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "predicciones" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "datos_climaticos" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insumos_actividad" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "actividades" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cat_tipos_alerta" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cat_tipos_recomendacion" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cat_tipos_insumo" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cat_tipos_actividad" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cultivos_parcela" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tipos_cultivo" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parcelas" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agricultores" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usuarios" CASCADE`);

    // Enums
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_indice_rag_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_indexacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_registro_wa_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "severidad_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_implementacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "prioridad_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nivel_riesgo_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_cultivo_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "req_agua_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_suelo_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rol_enum"`);
  }
}