import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WhatsAppTextMessage {
    to: string;
    body: string;
}

export interface WhatsAppTemplateMessage {
    to: string;
    templateName: string;
    languageCode: string;
    components?: object[];
}

@Injectable()
export class MetaWhatsappService {
    private readonly logger = new Logger(MetaWhatsappService.name);
    private readonly apiUrl: string;
    private readonly accessToken: string;
    private readonly phoneNumberId: string;

    private readonly messageCount = new Map<string, { count: number; resetAt: number }>();
    private readonly RATE_LIMIT = 10; // mensajes por minuto por número

    constructor(private readonly configService: ConfigService) {
        this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
        this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '');
        this.apiUrl = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
    }

    private checkRateLimit(to: string): boolean {
        const now = Date.now();
        const entry = this.messageCount.get(to);

        if (!entry || now > entry.resetAt) {
            this.messageCount.set(to, { count: 1, resetAt: now + 60000 });
            return true;
        }

        if (entry.count >= this.RATE_LIMIT) {
            this.logger.warn(`Rate limit alcanzado para ${to}`);
            return false;
        }

        entry.count++;
        return true;
    }

    async sendTextMessage(to: string, body: string): Promise<boolean> {
        if (!this.checkRateLimit(to)) return false;

        try {
            await axios.post(
                this.apiUrl,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'text',
                    text: { preview_url: false, body },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
            this.logger.log(`Mensaje enviado a ${to}`);
            return true;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error enviando mensaje a ${to}: ${msg}`);
            return false;
        }
    }

    async sendTemplateMessage(
        to: string,
        templateName: string,
        languageCode: string = 'es',
        components: object[] = [],
    ): Promise<boolean> {
        try {
            await axios.post(
                this.apiUrl,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components,
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
            this.logger.log(`Template ${templateName} enviado a ${to}`);
            return true;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error enviando template a ${to}: ${msg}`);
            return false;
        }
    }

    async markAsRead(messageId: string): Promise<void> {
        try {
            await axios.post(
                this.apiUrl,
                {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
        } catch {
            // No crítico
        }
    }

    formatPhone(phone: string): string {
        return phone.replace(/\D/g, '');
    }
}