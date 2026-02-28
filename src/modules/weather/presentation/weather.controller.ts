import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { WeatherService } from '../application/use-cases/weather.service';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(//private readonly weatherService: WeatherService
    ) {}

}
