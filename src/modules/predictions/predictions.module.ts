import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Prediccion } from './domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { PredictionsController } from './presentation/predictions.controller';
import { PredictionsService } from './application/use-cases/predictions.service';
import { MlService } from './application/use-cases/ml.service';
import { RecommendationsModule } from '@modules/recommendations/recommendations.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Prediccion,
            Parcela,
            CultivoParcela,
            TipoCultivo,
            DatoClimatico,
            Agricultor,
        ]),
        forwardRef(() => RecommendationsModule),
    ],
    controllers: [PredictionsController],
    providers: [PredictionsService, MlService],
    exports: [PredictionsService],
})
export class PredictionsModule {}