import {
    Controller, Get, Post, Put, Delete, Body, Param, Query,
    UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
    ApiTags, ApiOperation, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { WhatsappService } from '@modules/whatsapp/application/use-cases/whatsapp.service';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';
import { ChatbotService } from '@modules/chatbot/application/use-cases/chatbot.service';
import { CreateSesionWaDto } from '@modules/whatsapp/application/dto/create-sesion-wa.dto';
import { UpdateSesionWaDto } from '@modules/whatsapp/application/dto/update-sesion-wa.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles, Role } from '@common/decorators/roles.decorator';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TECNICO)
@ApiBearerAuth('access-token')
export class WhatsappController {
    constructor(
        private readonly whatsappService: WhatsappService,
        private readonly metaService: MetaWhatsappService,
        private readonly chatbotService: ChatbotService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Crear sesión WhatsApp' })
    async create(@Body() dto: CreateSesionWaDto) {
        return this.whatsappService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar sesiones WhatsApp' })
    @ApiQuery({ name: 'limit', required: false, example: 50 })
    async findAll(@Query('limit') limit?: number) {
        return this.whatsappService.findAll(limit ? Number(limit) : 50);
    }

    @Get('resumen')
    @ApiOperation({ summary: 'Resumen de sesiones WhatsApp' })
    async getResumen() {
        return this.whatsappService.getResumen();
    }

    @Get('conversaciones-activas')
    @ApiOperation({ summary: 'Conversaciones activas última hora' })
    async getConversacionesActivas() {
        return this.whatsappService.getConversacionesActivas();
    }

    @Get('historial/:waId')
    @ApiOperation({ summary: 'Historial conversación de un número' })
    async getHistorial(@Param('waId') waId: string) {
        const convId = `wa_${waId}`;
        return this.chatbotService.getHistorialPublico(convId);
    }

    @Post('enviar/:waId')
    @Roles(Role.ADMIN, Role.TECNICO)
    @ApiOperation({ summary: 'Enviar mensaje manual a un número WhatsApp' })
    async enviarMensajeManual(
        @Param('waId') waId: string,
        @Body() body: { mensaje: string },
    ) {
        const enviado = await this.metaService.sendTextMessage(waId, body.mensaje);
        return { enviado, waId, mensaje: body.mensaje };
    }

    @Post('pausar/:waId')
    @ApiOperation({ summary: 'Pausar bot para un número (minutos opcionales)' })
    async pausarBot(
        @Param('waId') waId: string,
        @Body() body: { minutos?: number },
    ) {
        const sesion = await this.whatsappService.pausarBot(waId, body.minutos);
        return {
            mensaje: body.minutos
                ? `Bot pausado por ${body.minutos} minutos`
                : 'Bot pausado indefinidamente',
            sesion,
        };
    }

    @Post('reanudar/:waId')
    @ApiOperation({ summary: 'Reanudar bot para un número' })
    async reanudarBot(@Param('waId') waId: string) {
        const sesion = await this.whatsappService.reanudarBot(waId);
        return { mensaje: 'Bot reanudado', sesion };
    }

    @Get('wa/:waId')
    @ApiOperation({ summary: 'Buscar sesión por número WhatsApp' })
    async findByWaId(@Param('waId') waId: string) {
        return this.whatsappService.findByWaId(waId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener sesión por ID' })
    async findOne(@Param('id') id: string) {
        return this.whatsappService.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar sesión WhatsApp' })
    async update(@Param('id') id: string, @Body() dto: UpdateSesionWaDto) {
        return this.whatsappService.update(id, dto);
    }

    @Put('wa/:waId')
    @ApiOperation({ summary: 'Actualizar sesión por número WhatsApp' })
    async updateByWaId(@Param('waId') waId: string, @Body() dto: UpdateSesionWaDto) {
        return this.whatsappService.updateByWaId(waId, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar sesión (solo admin)' })
    async remove(@Param('id') id: string) {
        return this.whatsappService.remove(id);
    }
}