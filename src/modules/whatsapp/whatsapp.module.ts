import { Module } from '@nestjs/common';
import { WhatsappController } from './presentation/whatsapp.controller';
import { WhatsappService } from './application/use-cases/whatsapp.service';

@Module({
  imports: [],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
