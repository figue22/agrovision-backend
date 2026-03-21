import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { ParcelsController } from '@modules/parcels/presentation/parcels.controller';
import { ParcelsService } from '@modules/parcels/application/use-cases/parcels.service';

@Module({
  imports: [TypeOrmModule.forFeature([Parcela, Agricultor, AsignacionTecnico])],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
