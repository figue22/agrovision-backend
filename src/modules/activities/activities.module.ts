import { Module } from '@nestjs/common';
import { ActivitiesController } from './presentation/activities.controller';
import { ActivitiesService } from './application/use-cases/activities.service';

/**
 * ActivitiesModule - Bitacora de actividades agricolas e insumos
 */
@Module({
  imports: [],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
