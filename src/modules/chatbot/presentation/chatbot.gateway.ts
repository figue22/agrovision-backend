import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatbotService } from '@modules/chatbot/application/use-cases/chatbot.service';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/chat',
})
export class ChatbotGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatbotGateway.name);

    constructor(private readonly chatbotService: ChatbotService) {}

    handleConnection(client: Socket) {
        this.logger.log(`Cliente conectado: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Cliente desconectado: ${client.id}`);
    }

    @SubscribeMessage('mensaje')
    async handleMensaje(
        @MessageBody() data: {
            mensaje: string;
            conversacion_id?: string;
            usuario_id: string;
            cultivo?: string;
            region?: string;
            nombre_usuario?: string;
        },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // Emitir "escribiendo..."
            client.emit('escribiendo', { estado: true });

            const response = await this.chatbotService.sendMessage(
                data.usuario_id,
                data.mensaje,
                data.conversacion_id,
                {
                    cultivo: data.cultivo,
                    region: data.region,
                    nombreUsuario: data.nombre_usuario,
                },
            );

            client.emit('escribiendo', { estado: false });
            client.emit('respuesta', response);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            client.emit('error_chat', { mensaje: msg });
        }
    }

    @SubscribeMessage('limpiar')
    async handleLimpiar(
        @MessageBody() data: { conversacion_id: string },
        @ConnectedSocket() client: Socket,
    ) {
        await this.chatbotService.clearConversation(data.conversacion_id);
        client.emit('conversacion_limpiada', { ok: true });
    }
}