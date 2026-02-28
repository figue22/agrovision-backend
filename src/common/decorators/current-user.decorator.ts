import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface IJwtPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof IJwtPayload | undefined, ctx: ExecutionContext): IJwtPayload | unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as IJwtPayload;
    return data ? user?.[data] : user;
  },
);
