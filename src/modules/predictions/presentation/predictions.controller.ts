import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { PredictionsService } from '../application/use-cases/predictions.service';

@ApiTags('Predictions')
@Controller('predictions')
export class PredictionsController {
  constructor(//private readonly predictionsService: PredictionsService

  ) {}
}
