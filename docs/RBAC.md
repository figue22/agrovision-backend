# Sistema RBAC — AgroVision

## Roles

| Rol | Descripción |
|---|---|
| `agricultor` | Usuario que registra parcelas, cultivos, actividades y recibe predicciones |
| `tecnico` | Supervisa agricultores, ve datos regionales, brinda asesoría |
| `admin` | Gestión completa: usuarios, roles, catálogos, documentos RAG, auditoría |

## Permisos por módulo

| Módulo / Endpoint | agricultor | tecnico | admin |
|---|---|---|---|
| **Auth** | | | |
| POST /auth/register | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ |
| POST /auth/refresh | ✅ | ✅ | ✅ |
| GET /auth/profile | ✅ | ✅ | ✅ |
| **Farmers** | | | |
| GET /farmers/profile | ✅ | ❌ | ❌ |
| PUT /farmers/profile | ✅ | ❌ | ❌ |
| GET /farmers | ❌ | ✅ | ✅ |
| GET /farmers/:id | ❌ | ✅ | ✅ |
| **Parcels** (futuro) | | | |
| CRUD propias parcelas | ✅ | ❌ | ❌ |
| Ver todas las parcelas | ❌ | ✅ | ✅ |
| **Crops** (futuro) | | | |
| CRUD propios cultivos | ✅ | ❌ | ❌ |
| Ver todos los cultivos | ❌ | ✅ | ✅ |
| **Activities** (futuro) | | | |
| CRUD propias actividades | ✅ | ❌ | ❌ |
| Ver todas las actividades | ❌ | ✅ | ✅ |
| **Predictions** (futuro) | | | |
| Ver propias predicciones | ✅ | ❌ | ❌ |
| Ver todas las predicciones | ❌ | ✅ | ✅ |
| **Recommendations** (futuro) | | | |
| Ver propias recomendaciones | ✅ | ❌ | ❌ |
| Ver todas las recomendaciones | ❌ | ✅ | ✅ |
| **Weather** (futuro) | | | |
| Ver clima por parcela | ✅ | ✅ | ✅ |
| **Alerts** (futuro) | | | |
| Ver propias alertas | ✅ | ❌ | ❌ |
| Ver todas las alertas | ❌ | ✅ | ✅ |
| **Chat** (futuro) | | | |
| Usar chatbot | ✅ | ✅ | ✅ |
| Intervenir conversaciones | ❌ | ✅ | ✅ |
| **Admin** | | | |
| GET /admin/users | ❌ | ❌ | ✅ |
| GET /admin/users/stats | ❌ | ❌ | ✅ |
| GET /admin/users/:id | ❌ | ❌ | ✅ |
| PUT /admin/users/role | ❌ | ❌ | ✅ |
| PUT /admin/users/status | ❌ | ❌ | ✅ |
| **Catalogs** (futuro) | | | |
| Leer catálogos | ✅ | ✅ | ✅ |
| Modificar catálogos | ❌ | ❌ | ✅ |
| **Documents RAG** (futuro) | | | |
| Consultar RAG | ✅ | ✅ | ✅ |
| Gestionar documentos | ❌ | ❌ | ✅ |
| **Audit** (futuro) | | | |
| Ver logs | ❌ | ❌ | ✅ |

## Cómo usar en un controller

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';

// Proteger todo el controller para un rol
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {}

// Proteger un endpoint específico para múltiples roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TECNICO)
@Get()
async findAll() {}

// Endpoint accesible por cualquier usuario autenticado (sin @Roles)
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile() {}
```

## Protección

- `JwtAuthGuard` → Verifica que el token JWT sea válido
- `RolesGuard` → Verifica que el rol del usuario esté en la lista de `@Roles()`
- Ambos guards se usan juntos: primero autentica, después autoriza
- Si no se pone `@Roles()`, cualquier usuario autenticado puede acceder
