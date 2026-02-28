import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { CatalogsService } from '../application/use-cases/catalogs.service';

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(//private readonly catalogsService: CatalogsService
  ) {}
}
