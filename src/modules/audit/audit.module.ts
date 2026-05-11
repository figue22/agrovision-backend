import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LogAuditoria } from './domain/entities/log-auditoria.entity';
import { AuditController } from './presentation/audit.controller';
import { AuditService } from './application/use-cases/audit.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LogAuditoria])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule { }