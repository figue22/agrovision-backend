import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { AdminController } from '@modules/admin/presentation/admin.controller';
import { AdminService } from '@modules/admin/application/use-cases/admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
