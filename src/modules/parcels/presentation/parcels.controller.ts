import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { ParcelsService } from '../application/use-cases/parcels.service';

@ApiTags('Parcels')
@Controller('parcels')
export class ParcelsController {
  constructor(//private readonly parcelsService: ParcelsService

  ) {}
}
