import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { DatoClimatico } from './domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { CatTipoAlerta } from '@modules/catalogs/domain/entities/cat-tipo-alerta.entity';
import { WeatherController } from './presentation/weather.controller';
import { WeatherService } from './application/use-cases/weather.service';
import { OpenWeatherMapService } from './application/use-cases/openweathermap.service';
import { IdeamService } from './application/use-cases/ideam.service';
import { WeatherJobProcessor } from './application/use-cases/weather-job.processor';
import { WeatherSchedulerService } from './application/use-cases/weather-scheduler.service';
import { ClimateAlertService } from '@modules/alerts/application/use-cases/climate-alert.service';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DatoClimatico, Parcela, Alerta, CatTipoAlerta, CultivoParcela]),
    ConfigModule,
    BullModule.registerQueue({ name: 'weather' }),
  ],
  controllers: [WeatherController],
  providers: [
    WeatherService,
    OpenWeatherMapService,
    IdeamService,
    WeatherJobProcessor,
    WeatherSchedulerService,
    ClimateAlertService,
  ],
  exports: [WeatherService, OpenWeatherMapService, IdeamService, WeatherSchedulerService, ClimateAlertService],
})
export class WeatherModule {}