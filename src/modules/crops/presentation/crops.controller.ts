import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { CropsService } from '../application/use-cases/crops.service';

@ApiTags('Crops')
@Controller('crops')
export class CropsController {
  constructor(//private readonly cropsService: CropsService

  ) {}
}
