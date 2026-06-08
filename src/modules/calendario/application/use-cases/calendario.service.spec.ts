import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalendarioService } from './calendario.service';
import { Recordatorio, EstadoRecordatorio } from '@modules/calendario/domain/entities/recordatorio.entity';
import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';
import { MetaWhatsappService } from '@modules/whatsapp/infrastructure/external-services/meta-whatsapp.service';

const mockRecordatorioRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((item) => ({ recordatorio_id: 'uuid-1', ...item })),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
};

const mockSesionRepo = {
    findOne: jest.fn().mockResolvedValue({
        sesion_wa_id: 'uuid-sesion-1',
        wa_id: '573001234567',
        esta_bloqueado: false,
    }),
};

const mockMetaService = {
    sendTextMessage: jest.fn().mockResolvedValue(true),
};

describe('CalendarioService', () => {
    let service: CalendarioService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarioService,
                { provide: getRepositoryToken(Recordatorio), useValue: mockRecordatorioRepo },
                { provide: getRepositoryToken(SesionWhatsapp), useValue: mockSesionRepo },
                { provide: MetaWhatsappService, useValue: mockMetaService },
            ],
        }).compile();

        service = module.get<CalendarioService>(CalendarioService);
        jest.clearAllMocks();
    });

    it('debe estar definido', () => { expect(service).toBeDefined(); });

    describe('crearRecordatorio', () => {
        it('debe crear 2 recordatorios (24h y 1h) para actividad futura', async () => {
            const fechaFutura = new Date();
            fechaFutura.setDate(fechaFutura.getDate() + 2);

            const result = await service.crearRecordatorio({
                usuario_id: 'uuid-user-1',
                titulo: 'Fertilización parcela',
                fecha_actividad: fechaFutura,
            });

            expect(result).toHaveLength(2);
            expect(mockRecordatorioRepo.save).toHaveBeenCalledTimes(2);
        });

        it('debe crear solo recordatorio 1h si actividad es en menos de 24h', async () => {
            const fechaProxima = new Date();
            fechaProxima.setHours(fechaProxima.getHours() + 2);

            const result = await service.crearRecordatorio({
                usuario_id: 'uuid-user-1',
                titulo: 'Riego urgente',
                fecha_actividad: fechaProxima,
            });

            expect(result).toHaveLength(1);
            expect(result[0].tipo_recordatorio).toBe('1h');
        });
    });

    describe('cancelarRecordatorios', () => {
        it('debe cancelar recordatorios de una actividad', async () => {
            await service.cancelarRecordatorios('uuid-actividad-1');
            expect(mockRecordatorioRepo.update).toHaveBeenCalledWith(
                { actividad_id: 'uuid-actividad-1', estado: EstadoRecordatorio.PENDIENTE },
                { estado: EstadoRecordatorio.CANCELADO },
            );
        });
    });

    describe('getRecordatoriosByUsuario', () => {
        it('debe retornar recordatorios del usuario', async () => {
            mockRecordatorioRepo.find.mockResolvedValueOnce([
                { recordatorio_id: 'uuid-1', titulo: 'Test', estado: 'pendiente' },
            ]);
            const result = await service.getRecordatoriosByUsuario('uuid-user-1');
            expect(result).toHaveLength(1);
        });
    });
});