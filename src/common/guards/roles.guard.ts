import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from '@common/decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay @Roles() en el endpoint, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No se encontró el usuario en el request');
    }

    // El campo en la entidad es 'rol' (español), no 'role'
    const userRole = user.rol;

    if (!userRole) {
      throw new ForbiddenException('El usuario no tiene un rol asignado');
    }

    const hasRole = requiredRoles.some((role) => role === userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere rol: ${requiredRoles.join(' o ')}. Tu rol: ${userRole}`,
      );
    }

    return true;
  }
}
