import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { SesionWhatsapp } from './domain/entities/sesion-whatsapp.entity';
import { WhatsappController } from './presentation/whatsapp.controller';
import { WebhookController } from './presentation/webhook.controller';
import { WhatsappService } from './application/use-cases/whatsapp.service';
import { WhatsappWebhookService } from './application/use-cases/whatsapp-webhook.service';
import { MetaWhatsappService } from './infrastructure/external-services/meta-whatsapp.service';
import { WhatsappMessageProcessor, WHATSAPP_QUEUE } from './infrastructure/whatsapp-message.processor';
import { ChatbotModule } from '@modules/chatbot/chatbot.module';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([SesionWhatsapp, Usuario, Parcela]),
        BullModule.registerQueue({ name: WHATSAPP_QUEUE }),
        ChatbotModule,
    ],
    controllers: [WhatsappController, WebhookController],
    providers: [
        WhatsappService,
        WhatsappWebhookService,
        MetaWhatsappService,
        WhatsappMessageProcessor,
    ],
    exports: [WhatsappService, MetaWhatsappService],
})
export class WhatsappModule {}