import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { AlertsService } from '../application/use-cases/alerts.service';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(//private readonly alertsService: AlertsService
  ) {}
}
