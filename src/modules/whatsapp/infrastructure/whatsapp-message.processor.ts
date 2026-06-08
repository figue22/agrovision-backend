import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';

export const WHATSAPP_QUEUE = 'whatsapp-messages';

export interface WhatsappMessageJob {
    to: string;
    body: string;
    type: 'text' | 'template';
    templateName?: string;
    components?: object[];
}

@Processor(WHATSAPP_QUEUE)
export class WhatsappMessageProcessor {
    private readonly logger = new Logger(WhatsappMessageProcessor.name);

    constructor(private readonly metaService: MetaWhatsappService) {}

    @Process('send-message')
    async handleSendMessage(job: Job<WhatsappMessageJob>): Promise<void> {
        const { to, body, type, templateName, components } = job.data;
        this.logger.log(`Procesando mensaje WA para ${to} [intento ${job.attemptsMade + 1}]`);

        if (type === 'template' && templateName) {
            await this.metaService.sendTemplateMessage(to, templateName, 'es', components);
        } else {
            await this.metaService.sendTextMessage(to, body);
        }
    }
}