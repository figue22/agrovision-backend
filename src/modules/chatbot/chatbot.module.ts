import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ChatbotController } from './presentation/chatbot.controller';
import { ChatbotService } from './application/use-cases/chatbot.service';

@Module({
  imports: [ConfigModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule { }