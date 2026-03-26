import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { CropsController } from '@modules/crops/presentation/crops.controller';
import { CropsService } from '@modules/crops/application/use-cases/crops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoCultivo,
      CultivoParcela,
      Parcela,
      Agricultor,
      AsignacionTecnico,
    ]),
  ],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule {}
