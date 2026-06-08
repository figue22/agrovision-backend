import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WhatsappAlertsService } from './whatsapp-alerts.service';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';
import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';
import { Severidad } from '@common/enums/enums';

const mockMetaService = {
    sendTextMessage: jest.fn().mockResolvedValue(true),
};

const mockSesionRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
};

const mockAlertaCritica = {
    alerta_id: 'uuid-alerta-1',
    usuario_id: 'uuid-user-1',
    severidad: Severidad.CRITICA,
    titulo: 'Alerta de helada',
    mensaje: 'Se esperan temperaturas bajo cero esta noche',
    accion_requerida: 'Proteger cultivos inmediatamente',
};

const mockAlertaBaja = {
    alerta_id: 'uuid-alerta-2',
    usuario_id: 'uuid-user-1',
    severidad: Severidad.BAJA,
    titulo: 'Alerta menor',
    mensaje: 'Condición leve detectada',
    accion_requerida: null,
};

describe('WhatsappAlertsService', () => {
    let service: WhatsappAlertsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WhatsappAlertsService,
                { provide: MetaWhatsappService, useValue: mockMetaService },
                { provide: getRepositoryToken(SesionWhatsapp), useValue: mockSesionRepo },
            ],
        }).compile();

        service = module.get<WhatsappAlertsService>(WhatsappAlertsService);
        jest.clearAllMocks();
    });

    it('debe estar definido', () => { expect(service).toBeDefined(); });

    describe('notificarAlerta', () => {
        it('debe enviar mensaje para alerta crítica', async () => {
            mockSesionRepo.findOne.mockResolvedValue({
                sesion_wa_id: 'uuid-sesion-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                mensajes_enviados: 0,
            });

            await service.notificarAlerta(mockAlertaCritica as any);

            expect(mockMetaService.sendTextMessage).toHaveBeenCalledWith(
                '573001234567',
                expect.stringContaining('CRÍTICA'),
            );
        });

        it('debe enviar mensaje para alerta alta', async () => {
            mockSesionRepo.findOne.mockResolvedValue({
                sesion_wa_id: 'uuid-sesion-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                mensajes_enviados: 0,
            });

            await service.notificarAlerta({
                ...mockAlertaCritica,
                severidad: Severidad.ALTA,
            } as any);

            expect(mockMetaService.sendTextMessage).toHaveBeenCalledWith(
                '573001234567',
                expect.stringContaining('ALTA'),
            );
        });

        it('NO debe enviar mensaje para alerta baja', async () => {
            await service.notificarAlerta(mockAlertaBaja as any);
            expect(mockMetaService.sendTextMessage).not.toHaveBeenCalled();
        });

        it('NO debe enviar si usuario no tiene WhatsApp', async () => {
            mockSesionRepo.findOne.mockResolvedValue(null);
            await service.notificarAlerta(mockAlertaCritica as any);
            expect(mockMetaService.sendTextMessage).not.toHaveBeenCalled();
        });

        it('debe actualizar contador mensajes_enviados', async () => {
            mockSesionRepo.findOne.mockResolvedValue({
                sesion_wa_id: 'uuid-sesion-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                mensajes_enviados: 5,
            });

            await service.notificarAlerta(mockAlertaCritica as any);
            expect(mockSesionRepo.update).toHaveBeenCalledWith(
                'uuid-sesion-1',
                { mensajes_enviados: 6 },
            );
        });
    });

    describe('notificarAlertasMasivas', () => {
        it('debe filtrar solo alertas críticas y altas', async () => {
            mockSesionRepo.findOne.mockResolvedValue({
                sesion_wa_id: 'uuid-sesion-1',
                wa_id: '573001234567',
                esta_bloqueado: false,
                mensajes_enviados: 0,
            });

            await service.notificarAlertasMasivas([
                mockAlertaCritica as any,
                mockAlertaBaja as any,
            ]);

            expect(mockMetaService.sendTextMessage).toHaveBeenCalledTimes(1);
        });
    });
});