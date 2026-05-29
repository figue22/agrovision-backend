import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { DatoClimatico } from './domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { WeatherController } from './presentation/weather.controller';
import { WeatherService } from './application/use-cases/weather.service';
import { OpenWeatherMapService } from './application/use-cases/openweathermap.service';
import { IdeamService } from './application/use-cases/ideam.service';
import { WeatherJobProcessor } from './application/use-cases/weather-job.processor';
import { WeatherSchedulerService } from './application/use-cases/weather-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DatoClimatico, Parcela]),
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
  ],
  exports: [WeatherService, OpenWeatherMapService, IdeamService, WeatherSchedulerService],
})
export class WeatherModule {}