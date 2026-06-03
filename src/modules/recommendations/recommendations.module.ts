import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Recomendacion } from './domain/entities/recomendacion.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { RecommendationsController } from './presentation/recommendations.controller';
import { RecommendationsService } from './application/use-cases/recommendations.service';
import { CatTipoRecomendacion } from '@modules/catalogs/domain/entities/cat-tipo-recomendacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recomendacion, Prediccion, Parcela, CatTipoRecomendacion])],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule { }