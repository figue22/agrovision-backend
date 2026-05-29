import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Alerta } from './domain/entities/alerta.entity';
import { AlertsController } from './presentation/alerts.controller';
import { AlertsService } from './application/use-cases/alerts.service';
import { ClimateAlertService } from './application/use-cases/climate-alert.service';
import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CatTipoAlerta } from '@modules/catalogs/domain/entities/cat-tipo-alerta.entity';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Alerta,
      DatoClimatico,
      Parcela,
      CatTipoAlerta,
      CultivoParcela,
    ]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, ClimateAlertService],
  exports: [AlertsService, ClimateAlertService],
})
export class AlertsModule {}