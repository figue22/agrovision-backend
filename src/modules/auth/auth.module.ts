import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/use-cases/auth.service';

/**
 * AuthModule - Autenticacion JWT, registro, login, 2FA, roles
 */
@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
