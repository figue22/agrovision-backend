import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AuthService } from '@modules/auth/application/use-cases/auth.service';
import { AuthController } from '@modules/auth/presentation/auth.controller';
import { JwtStrategy } from '@common/strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Agricultor]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
