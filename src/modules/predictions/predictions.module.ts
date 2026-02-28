import { Module } from '@nestjs/common';
import { PredictionsController } from './presentation/predictions.controller';
import { PredictionsService } from './application/use-cases/predictions.service';

/**
 * PredictionsModule - Predicciones de rendimiento ML, integracion gRPC
 */
@Module({
  imports: [],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
