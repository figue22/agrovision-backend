import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';
import { WhatsappService } from './whatsapp.service';
import { ChatbotService } from '@modules/chatbot/application/use-cases/chatbot.service';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';

const mockMetaService = {
    sendTextMessage: jest.fn().mockResolvedValue(true),
    markAsRead: jest.fn().mockResolvedValue(undefined),
};

const mockWhatsappService = {
    findOrCreate: jest.fn().mockResolvedValue({
        sesion_wa_id: 'uuid-1',
        wa_id: '573001234567',
        esta_bloqueado: false,
        usuario_id: null,
        contexto_sesion: {},
        mensajes_enviados: 0,
        mensajes_recibidos: 0,
        total_consultas_rag: 0,
        total_predicciones: 0,
    }),
    updateByWaId: jest.fn().mockResolvedValue({}),
};

const mockChatbotService = {
    sendMessage: jest.fn().mockResolvedValue({
        conversacion_id: 'uuid-conv',
        respuesta: 'Respuesta de prueba',
        tipo: 'rag',
        timestamp: new Date().toISOString(),
    }),
};

const mockUsuarioRepo = {
    findOne: jest.fn().mockResolvedValue(null),
};

const mockParcelaRepo = {
    find: jest.fn().mockResolvedValue([]),
};

describe('WhatsappWebhookService', () => {
    let service: WhatsappWebhookService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WhatsappWebhookService,
                { provide: MetaWhatsappService, useValue: mockMetaService },
                { provide: WhatsappService, useValue: mockWhatsappService },
                { provide: ChatbotService, useValue: mockChatbotService },
                { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
                { provide: getRepositoryToken(Parcela), useValue: mockParcelaRepo },
            ],
        }).compile();

        service = module.get<WhatsappWebhookService>(WhatsappWebhookService);
        jest.clearAllMocks();
    });

    it('debe estar definido', () => { expect(service).toBeDefined(); });

    describe('processWebhook', () => {
        it('debe ignorar si no es whatsapp_business_account', async () => {
            await service.processWebhook({ object: 'otro', entry: [] });
            expect(mockChatbotService.sendMessage).not.toHaveBeenCalled();
        });

        it('debe solicitar correo en primer mensaje sin cuenta asociada', async () => {
            await service.processWebhook({
                object: 'whatsapp_business_account',
                entry: [{
                    id: 'entry-1',
                    changes: [{
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: { phone_number_id: '123', display_phone_number: '123' },
                            contacts: [{ profile: { name: 'Juan' }, wa_id: '573001234567' }],
                            messages: [{
                                from: '573001234567',
                                id: 'msg-1',
                                timestamp: '1234567890',
                                type: 'text',
                                text: { body: 'Hola' },
                            }],
                        },
                    }],
                }],
            });
            expect(mockMetaService.sendTextMessage).toHaveBeenCalledWith(
                '573001234567',
                expect.stringContaining('correo'),
            );
        });

        it('debe responder con error si correo no existe', async () => {
            mockWhatsappService.findOrCreate.mockResolvedValueOnce({
                sesion_wa_id: 'uuid-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                usuario_id: null,
                contexto_sesion: { esperando_correo: true },
                mensajes_enviados: 0,
                mensajes_recibidos: 0,
                total_consultas_rag: 0,
                total_predicciones: 0,
            });
            mockUsuarioRepo.findOne.mockResolvedValueOnce(null);

            await service.processWebhook({
                object: 'whatsapp_business_account',
                entry: [{
                    id: 'entry-1',
                    changes: [{
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: { phone_number_id: '123', display_phone_number: '123' },
                            contacts: [],
                            messages: [{
                                from: '573001234567',
                                id: 'msg-2',
                                timestamp: '1234567890',
                                type: 'text',
                                text: { body: 'noexiste@test.com' },
                            }],
                        },
                    }],
                }],
            });

            expect(mockMetaService.sendTextMessage).toHaveBeenCalledWith(
                '573001234567',
                expect.stringContaining('No encontré ninguna cuenta'),
            );
        });

        it('debe permitir omitir la asociación', async () => {
            mockWhatsappService.findOrCreate.mockResolvedValueOnce({
                sesion_wa_id: 'uuid-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                usuario_id: null,
                contexto_sesion: { esperando_correo: true },
                mensajes_enviados: 0,
                mensajes_recibidos: 0,
                total_consultas_rag: 0,
                total_predicciones: 0,
            });

            await service.processWebhook({
                object: 'whatsapp_business_account',
                entry: [{
                    id: 'entry-1',
                    changes: [{
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: { phone_number_id: '123', display_phone_number: '123' },
                            contacts: [],
                            messages: [{
                                from: '573001234567',
                                id: 'msg-3',
                                timestamp: '1234567890',
                                type: 'text',
                                text: { body: 'omitir' },
                            }],
                        },
                    }],
                }],
            });

            expect(mockMetaService.sendTextMessage).toHaveBeenCalledWith(
                '573001234567',
                expect.stringContaining('Entendido'),
            );
        });
    });

    describe('handleComando', () => {
        it('debe responder /menu sin cuenta asociada', async () => {
            mockWhatsappService.findOrCreate.mockResolvedValueOnce({
                sesion_wa_id: 'uuid-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                usuario_id: null,
                contexto_sesion: { omitio_asociacion: true },
                mensajes_enviados: 0,
                mensajes_recibidos: 0,
                total_consultas_rag: 0,
                total_predicciones: 0,
            });

            await service.processWebhook({
                object: 'whatsapp_business_account',
                entry: [{
                    id: 'entry-1',
                    changes: [{
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: { phone_number_id: '123', display_phone_number: '123' },
                            contacts: [],
                            messages: [{
                                from: '573001234567',
                                id: 'msg-1',
                                timestamp: '1234567890',
                                type: 'text',
                                text: { body: '/menu' },
                            }],
                        },
                    }],
                }],
            });

            expect(mockMetaService.sendTextMessage).toHaveBeenCalledWith(
                '573001234567',
                expect.stringContaining('Menú AgroVision'),
            );
        });

        it('debe requerir cuenta para /prediccion', async () => {
            mockWhatsappService.findOrCreate.mockResolvedValueOnce({
                sesion_wa_id: 'uuid-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                usuario_id: null,
                contexto_sesion: { omitio_asociacion: true },
                mensajes_enviados: 0,
                mensajes_recibidos: 0,
                total_consultas_rag: 0,
                total_predicciones: 0,
            });

            await service.processWebhook({
                object: 'whatsapp_business_account',
                entry: [{
                    id: 'entry-1',
                    changes: [{
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: { phone_number_id: '123', display_phone_number: '123' },
                            contacts: [],
                            messages: [{
                                from: '573001234567',
                                id: 'msg-2',
                                timestamp: '1234567890',
                                type: 'text',
                                text: { body: '/prediccion' },
                            }],
                        },
                    }],
                }],
            });

            expect(mockMetaService.sendTextMessage).toHaveBeenCalledWith(
                '573001234567',
                expect.stringContaining('vincular'),
            );
        });
    });
});