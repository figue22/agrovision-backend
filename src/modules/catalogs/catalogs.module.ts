import { Module } from '@nestjs/common';
import { CatalogsController } from './presentation/catalogs.controller';
import { CatalogsService } from './application/use-cases/catalogs.service';

/**
 * CatalogsModule - Catalogos del sistema (tipos actividad, alerta, recomendacion, insumo)
 */
@Module({
  imports: [],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
