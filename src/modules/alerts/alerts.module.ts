import { Module } from '@nestjs/common';
import { AlertsController } from './presentation/alerts.controller';
import { AlertsService } from './application/use-cases/alerts.service';

/**
 * AlertsModule - Alertas climaticas automatizadas
 */
@Module({
  imports: [],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
