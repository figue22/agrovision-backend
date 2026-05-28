import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { DatoClimatico } from './domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { WeatherController } from './presentation/weather.controller';
import { WeatherService } from './application/use-cases/weather.service';
import { OpenWeatherMapService } from './application/use-cases/openweathermap.service';
import { IdeamService } from './application/use-cases/ideam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DatoClimatico, Parcela]),
    ConfigModule,
  ],
  controllers: [WeatherController],
  providers: [WeatherService, OpenWeatherMapService, IdeamService],
  exports: [WeatherService, OpenWeatherMapService, IdeamService],
})
export class WeatherModule {}