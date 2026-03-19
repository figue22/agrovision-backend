import { SetMetadata } from '@nestjs/common';
import { Rol } from '@common/enums/enums';

// Re-exportar Rol como Role para mantener compatibilidad con código existente
export { Rol as Role } from '@common/enums/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
