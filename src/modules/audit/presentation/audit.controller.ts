import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { AuditService } from '../application/use-cases/audit.service';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(//private readonly auditService: AuditService
  ) {}
}
