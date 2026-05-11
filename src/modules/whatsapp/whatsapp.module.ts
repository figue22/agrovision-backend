import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SesionWhatsapp } from './domain/entities/sesion-whatsapp.entity';
import { WhatsappController } from './presentation/whatsapp.controller';
import { WhatsappService } from './application/use-cases/whatsapp.service';

@Module({
  imports: [TypeOrmModule.forFeature([SesionWhatsapp])],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule { }