import { Module } from '@nestjs/common';
import { AuditController } from './presentation/audit.controller';
import { AuditService } from './application/use-cases/audit.service';

/**
 * AuditModule - Logs de auditoria, tracking de cambios
 */
@Module({
  imports: [],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
