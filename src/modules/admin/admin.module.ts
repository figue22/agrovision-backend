import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { AdminService } from './application/use-cases/admin.service';

/**
 * AdminModule - Panel administrativo, metricas, reportes
 */
@Module({
  imports: [],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
