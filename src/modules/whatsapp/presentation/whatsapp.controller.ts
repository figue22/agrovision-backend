import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { WhatsappService } from '../application/use-cases/whatsapp.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(//private readonly whatsappService: WhatsappService
    ) {}
  

}
