import { Module } from '@nestjs/common';
import { RecommendationsController } from './presentation/recommendations.controller';
import { RecommendationsService } from './application/use-cases/recommendations.service';

/**
 * RecommendationsModule - Recomendaciones personalizadas por prediccion
 */
@Module({
  imports: [],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
