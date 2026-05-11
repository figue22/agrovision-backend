import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Alerta } from './domain/entities/alerta.entity';
import { AlertsController } from './presentation/alerts.controller';
import { AlertsService } from './application/use-cases/alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule { }