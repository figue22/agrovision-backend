import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Actividad } from './domain/entities/actividad.entity';
import { InsumoActividad } from './domain/entities/insumo-actividad.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { ActivitiesController } from './presentation/activities.controller';
import { ActivitiesService } from './application/use-cases/activities.service';

@Module({
  imports: [TypeOrmModule.forFeature([Actividad, InsumoActividad, Parcela])],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule { }