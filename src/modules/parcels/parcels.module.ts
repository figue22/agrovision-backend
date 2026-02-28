import { Module } from '@nestjs/common';
import { ParcelsController } from './presentation/parcels.controller';
import { ParcelsService } from './application/use-cases/parcels.service';

/**
 * ParcelsModule - Gestion de parcelas con geolocalizacion PostGIS
 */
@Module({
  imports: [],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
