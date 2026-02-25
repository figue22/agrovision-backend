# 🌾 AgroVision Backend - API Principal

> Backend monolito modular con NestJS y Clean Architecture para la plataforma AgroVision Predictor & RAG-Support.

## Descripción

Servicio backend principal que gestiona autenticación, usuarios, agricultores, parcelas agrícolas, cultivos y rotación, actividades con insumos, integración con datos meteorológicos, predicciones ML, recomendaciones, alertas climáticas, documentos RAG, sesiones WhatsApp y auditoría completa del sistema.

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| NestJS | 10.3.0 | Framework backend principal |
| TypeScript | 5.3.3 | Lenguaje tipado |
| TypeORM | 0.3.20 | ORM para PostgreSQL |
| PostgreSQL | 15.5 | Base de datos relacional |
| PostGIS | 3.3 | Extensión geoespacial |
| pg_crypto | - | Cifrado de datos sensibles |
| Redis | 7.2 | Cache, sesiones y colas |
| BullMQ | 10.1.1 | Colas de jobs asíncronos |
| Passport JWT | 10.0.3 | Autenticación |
| Winston | 3.11.0 | Logging estructurado |
| Argon2 | 0.31.2 | Hash de contraseñas (Argon2id) |
| Speakeasy | 2.0.0 | 2FA/TOTP |

## Arquitectura - Clean Architecture

```
src/
├── modules/                        # Módulos de negocio (bounded contexts)
│   ├── auth/                       # Autenticación y autorización
│   │   ├── domain/                 # Entidades, interfaces, value objects
│   │   ├── application/            # Use cases, DTOs, mappers
│   │   ├── infrastructure/         # Repositorios, servicios externos
│   │   └── presentation/           # Controllers, guards
│   ├── farmers/                    # Gestión de agricultores
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── parcels/                    # Gestión de parcelas agrícolas (PostGIS)
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── crops/                      # Tipos de cultivo + cultivos por parcela (rotación/policultivo)
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── activities/                 # Bitácora de actividades + insumos por actividad
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── weather/                    # Integración datos meteorológicos (series temporales)
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── predictions/                # Predicciones ML (XGBoost + LSTM)
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── recommendations/            # Recomendaciones basadas en predicciones + RAG
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── alerts/                     # Sistema de alertas y notificaciones multicanal
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── whatsapp/                   # Sesiones WhatsApp Business (efímeras, sin historial)
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── chatbot/                    # Motor conversacional + integración RAG
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── documents/                  # Documentos técnicos RAG + índice vectorial ChromaDB
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── catalogs/                   # Tablas catálogo expansibles (tipos actividad/insumo/recomendación/alerta)
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   ├── audit/                      # Logs de auditoría (append-only, Ley 1581/2012)
│   │   └── (domain/ application/ infrastructure/ presentation/)
│   └── admin/                      # Panel administrativo
│       └── (domain/ application/ infrastructure/ presentation/)
├── common/                         # Componentes transversales
│   ├── guards/                     # JWT, RBAC guards
│   ├── filters/                    # Exception filters globales
│   ├── pipes/                      # Validation, transform pipes
│   ├── decorators/                 # Decoradores custom (@Roles, @CurrentUser)
│   ├── interceptors/               # Logging, timeout, transform
│   ├── logger/                     # Winston logging estructurado
│   ├── queue/                      # BullMQ job processing
│   └── file-storage/               # Abstracción de almacenamiento (S3)
├── config/                         # Configuración (DB, JWT, Redis, APIs)
├── database/
│   ├── migrations/                 # Migraciones TypeORM versionadas
│   └── seeds/                      # Datos semilla (catálogos iniciales)
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
```

## Módulos del Sistema

| Módulo | Responsabilidad | Tablas BD |
|---|---|---|
| **Auth** | JWT (RS256), refresh tokens, 2FA/TOTP, RBAC guards | `usuarios` |
| **Farmers** | CRUD agricultores, validación cédula, perfiles | `agricultores` (extiende `usuarios` 1:1) |
| **Parcels** | Gestión parcelas con PostGIS, geolocalización GPS | `parcelas` |
| **Crops** | Catálogo de cultivos, rotación agrícola, policultivo | `tipos_cultivo`, `cultivos_parcela` |
| **Activities** | Bitácora agrícola, insumos por actividad, costos | `actividades`, `insumos_actividad` |
| **Weather** | OpenWeatherMap/IDEAM, cache Redis 6h, jobs programados | `datos_climaticos` |
| **Predictions** | Predicciones ML (XGBoost+LSTM), intervalos de confianza | `predicciones` |
| **Recommendations** | Recomendaciones accionables desde predicciones + RAG | `recomendaciones` |
| **Alerts** | Notificaciones multicanal (WhatsApp, push, email) | `alertas` |
| **WhatsApp** | Sesiones efímeras, contexto en JSONB+Redis, sin historial | `sesiones_whatsapp` |
| **Chatbot** | Contexto conversacional, integración RAG, intent detection | (usa `sesiones_whatsapp`) |
| **Documents** | Documentos técnicos RAG + estado indexación ChromaDB | `documentos`, `indice_rag_documentos` |
| **Catalogs** | Tipos de actividad, insumo, recomendación y alerta | `cat_tipos_actividad`, `cat_tipos_insumo`, `cat_tipos_recomendacion`, `cat_tipos_alerta` |
| **Audit** | Registro append-only, cumplimiento Ley 1581/2012 | `logs_auditoria` |
| **Admin** | Dashboard administrativo, gestión usuarios y contenido RAG | (transversal) |

## Base de Datos — Esquema ER v3 (3FN)

18 entidades totales: 14 tablas de negocio + 4 tablas catálogo. Motor: PostgreSQL 15.5 + PostGIS 3.3.

### Capa 1: Autenticación y Usuarios
- **`usuarios`** — Autenticación central (correo, hash Argon2id, rol ENUM: admin/tecnico/agricultor, 2FA TOTP)
- **`agricultores`** — Extiende usuarios 1:1 (cédula, municipio, departamento, tamaño finca en ha)

### Capa 2: Dominio Agrícola
- **`parcelas`** — Terrenos con geolocalización PostGIS `GEOGRAPHY(POINT,4326)`, suelo, pH, altitud, polígono GeoJSON
- **`tipos_cultivo`** — Catálogo maestro de especies (parámetros óptimos: temperatura, altitud, pH, requerimiento agua)
- **`cultivos_parcela`** — Pivote parcela↔cultivo en el tiempo (rotación, policultivo, rendimiento esperado vs real, temporadas)
- **`actividades`** — Bitácora de acciones por parcela (tipo FK a catálogo, costo COP, adjuntos JSONB)
- **`insumos_actividad`** — Insumos por actividad (nombre, tipo FK a catálogo, cantidad, costo unitario, marca)

### Capa 3: Datos Climáticos
- **`datos_climaticos`** — Series temporales por parcela (temp, precipitación, humedad, viento, UV, fuente OpenWeatherMap/IDEAM)

### Capa 4: Predicciones ML
- **`predicciones`** — Resultados ML (versión modelo, tipo xgboost/lstm/ensemble, rendimiento, confianza, intervalo 95%, riesgo, features JSONB)
- **`recomendaciones`** — Acciones concretas por predicción (prioridad, estado implementación, feedback agricultor, calificación eficacia, documento fuente RAG)

### Capa 5: Alertas y Notificaciones
- **`alertas`** — Notificaciones proactivas multicanal (severidad ENUM, acción requerida, canales enviados, expiración)

### Capa 6: WhatsApp
- **`sesiones_whatsapp`** — Sesiones efímeras (wa_id único, estado registro, contexto JSONB temporal, sin historial de mensajes)

### Capa 7: Documentos y RAG
- **`documentos`** — Documentos técnicos (FAO, ICA, AGROSAVIA) con estado de indexación y ruta S3
- **`indice_rag_documentos`** — Estado técnico en ChromaDB 1:1 con documentos (chunks, embedding model, vector IDs JSONB)

### Capa 8: Auditoría
- **`logs_auditoria`** — Append-only (acción, entidad, valores antes/después JSONB, IP, user-agent, endpoint)

### Tablas Catálogo (SERIAL PK, expandibles sin migración)
- **`cat_tipos_actividad`** — siembra, riego, fertilización, fumigación, cosecha, poda, otro
- **`cat_tipos_insumo`** — fertilizante, pesticida, herbicida, semilla, otro
- **`cat_tipos_recomendacion`** — fertilización, riego, plagas, siembra, cosecha, general
- **`cat_tipos_alerta`** — helada, sequía, lluvia_fuerte, viento, plaga, recordatorio, sistema

### Criterio ENUM vs Catálogo
- **ENUM** = Valores fijos que nunca cambian (roles, estados, severidades, prioridades, niveles de riesgo, req. agua)
- **Catálogo** = Valores que pueden crecer sin migración (tipos de actividad, insumo, alerta, recomendación)

## Comunicación con Otros Servicios

| Destino | Protocolo | Puerto |
|---|---|---|
| ML Service (FastAPI) | gRPC | :8000 |
| RAG Service (LangChain) | HTTP REST | :8001 |
| PostgreSQL + PostGIS | TypeORM | :5432 |
| Redis | ioredis | :6379 |
| WhatsApp Business API | Webhook HTTP | Meta Cloud |
| OpenWeatherMap | HTTP REST | Externo |
| IDEAM | HTTP REST | Externo |

## Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/agrovision

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Microservicios
ML_SERVICE_URL=http://localhost:8000
RAG_SERVICE_URL=http://localhost:8001

# APIs Externas
OPENWEATHER_API_KEY=your-api-key
WHATSAPP_TOKEN=your-whatsapp-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
OPENAI_API_KEY=your-openai-key

# General
NODE_ENV=development
PORT=4000
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
```

## Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones
npm run migration:run

# Ejecutar seeds (catálogos iniciales + datos semilla)
npm run seed:run

# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Tests
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
```

## API Documentation

Documentación Swagger disponible en:
- **Swagger UI**: `http://localhost:4000/api/docs`
- **JSON Schema**: `http://localhost:4000/api/docs-json`

## Criterios de Calidad

| Métrica | Objetivo |
|---|---|
| Cobertura de tests | > 70% |
| Latencia API (p95) | < 200ms |
| Disponibilidad | > 99% uptime |

## Contribución

1. Crear branch desde `develop`: `git checkout -b feature/nombre-feature`
2. Commits con convención: `feat:`, `fix:`, `docs:`, `refactor:`
3. Pull Request hacia `develop` con descripción clara

## Licencia

Proyecto privado - AgroVision © 2026
