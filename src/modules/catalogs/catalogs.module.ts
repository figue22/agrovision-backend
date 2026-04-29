import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatTipoActividad } from './domain/entities/cat-tipo-actividad.entity';
import { CatTipoAlerta } from './domain/entities/cat-tipo-alerta.entity';
import { CatTipoRecomendacion } from './domain/entities/cat-tipo-recomendacion.entity';
import { CatTipoInsumo } from './domain/entities/cat-tipo-insumo.entity';
import { CatalogsController } from './presentation/catalogs.controller';
import { CatalogsService } from './application/use-cases/catalogs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CatTipoActividad,
      CatTipoAlerta,
      CatTipoRecomendacion,
      CatTipoInsumo,
    ]),
  ],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}