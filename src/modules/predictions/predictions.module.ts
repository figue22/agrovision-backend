import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Prediccion } from './domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { PredictionsController } from './presentation/predictions.controller';
import { PredictionsService } from './application/use-cases/predictions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prediccion, Parcela])],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule { }