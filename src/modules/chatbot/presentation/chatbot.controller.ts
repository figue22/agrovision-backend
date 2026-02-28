import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
//import { ChatbotService } from '../application/use-cases/chatbot.service';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(//private readonly chatbotService: ChatbotService
  ) {}
}
