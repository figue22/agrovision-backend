import { Module } from '@nestjs/common';
import { ChatbotController } from './presentation/chatbot.controller';
import { ChatbotService } from './application/use-cases/chatbot.service';

/**
 * ChatbotModule - Motor conversacional LangChain, gestion de contexto
 */
@Module({
  imports: [],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
