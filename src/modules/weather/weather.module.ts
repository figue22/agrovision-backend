import { Module } from '@nestjs/common';
import { WeatherController } from './presentation/weather.controller';
import { WeatherService } from './application/use-cases/weather.service';

/**
 * WeatherModule - Datos climaticos, integracion OpenWeatherMap/IDEAM
 */
@Module({
  imports: [],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
