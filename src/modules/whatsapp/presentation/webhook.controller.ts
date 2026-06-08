import {
    Controller, Get, Post, Body, Query, Res,
    HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsappWebhookService } from '@modules/whatsapp/application/use-cases/whatsapp-webhook.service';

@ApiTags('WhatsApp Webhook')
@Controller('webhook/whatsapp')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);
    private readonly verifyToken: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly webhookService: WhatsappWebhookService,
    ) {
        this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN', '');
    }

    /**
     * GET — Verificación del webhook por Meta
     */
    @Get()
    @ApiOperation({ summary: 'Verificación webhook Meta WhatsApp' })
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        if (mode === 'subscribe' && token === this.verifyToken) {
            this.logger.log('Webhook verificado por Meta ✅');
            return res.status(200).send(challenge);
        }
        this.logger.warn('Verificación webhook fallida');
        return res.status(403).send('Forbidden');
    }

    /**
     * POST — Recibir mensajes entrantes de WhatsApp
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Recibir mensajes WhatsApp entrantes' })
    async receiveMessage(@Body() body: any) {
        try {
            await this.webhookService.processWebhook(body);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error procesando webhook: ${msg}`);
        }
        // Siempre retornar 200 a Meta
        return { status: 'ok' };
    }
}