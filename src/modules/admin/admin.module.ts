import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { AdminController } from '@modules/admin/presentation/admin.controller';
import { AdminService } from '@modules/admin/application/use-cases/admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Agricultor, AsignacionTecnico])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
