import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { FarmersService } from '../application/use-cases/farmers.service';

@ApiTags('Farmers')
@Controller('farmers')
export class FarmersController {
  constructor(//private readonly farmersService: FarmersService
    ) {}
}
