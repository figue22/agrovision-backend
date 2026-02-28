import { SetMetadata } from '@nestjs/common';

export enum Role {
  AGRICULTOR = 'agricultor',
  TECNICO = 'tecnico',
  ADMIN = 'admin',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
