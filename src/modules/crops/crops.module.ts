import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { AsignacionTecnico } from '@modules/farmers/domain/entities/asignacion-tecnico.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { CropsController } from '@modules/crops/presentation/crops.controller';
import { CropsService } from '@modules/crops/application/use-cases/crops.service';
import {Recomendacion} from "@modules/recommendations/domain/entities/recomendacion.entity";
import {Actividad} from "@modules/activities/domain/entities/actividad.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoCultivo,
      CultivoParcela,
      Parcela,
      Agricultor,
      AsignacionTecnico,
      Prediccion,
      Recomendacion,
      Actividad,
    ]),
  ],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule {}