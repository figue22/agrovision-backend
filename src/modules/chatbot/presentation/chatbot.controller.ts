import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatbotService } from '@modules/chatbot/application/use-cases/chatbot.service';
import { SendMessageDto } from '@modules/chatbot/application/dto/send-message.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

@ApiTags('Chatbot')
@Controller('chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @ApiOperation({ summary: 'Enviar mensaje al chatbot agrícola' })
  @ApiResponse({ status: 201, description: 'Respuesta del chatbot' })
  async sendMessage(
    @CurrentUser() usuario: Usuario,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatbotService.sendMessage(
      usuario.usuario_id,
      dto.mensaje,
      dto.conversacion_id,
      {
        cultivo: dto.cultivo,
        region: dto.region,
        nombreUsuario: `${usuario.nombre} ${usuario.apellido}`,
      },
    );
  }

  @Get('historial/:conversacionId')
  @ApiOperation({ summary: 'Obtener historial de conversación' })
  async getHistorial(@Param('conversacionId') conversacionId: string) {
    return this.chatbotService.getHistorialPublico(conversacionId);
  }

  @Delete('conversacion/:conversacionId')
  @ApiOperation({ summary: 'Limpiar conversación' })
  async clearConversation(@Param('conversacionId') conversacionId: string) {
    return this.chatbotService.clearConversation(conversacionId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas del chatbot' })
  async getStats() {
    return this.chatbotService.getConversacionesActivas();
  }
}