import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { RecommendationsService } from '../application/use-cases/recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(//private readonly recommendationsService: RecommendationsService
    ) {}
}
