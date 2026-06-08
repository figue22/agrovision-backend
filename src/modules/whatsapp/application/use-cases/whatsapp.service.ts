import {
    Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';
import { CreateSesionWaDto } from '@modules/whatsapp/application/dto/create-sesion-wa.dto';
import { UpdateSesionWaDto } from '@modules/whatsapp/application/dto/update-sesion-wa.dto';
import { EstadoRegistroWhatsapp } from '@common/enums/enums';

@Injectable()
export class WhatsappService {
    constructor(
        @InjectRepository(SesionWhatsapp)
        private readonly sesionRepo: Repository<SesionWhatsapp>,
    ) { }

    async create(dto: CreateSesionWaDto): Promise<SesionWhatsapp> {
        const existente = await this.sesionRepo.findOne({ where: { wa_id: dto.wa_id } });
        if (existente) throw new ConflictException(`Ya existe una sesión con wa_id '${dto.wa_id}'`);

        const now = new Date();
        const sesion = this.sesionRepo.create({
            ...dto,
            estado_registro: dto.estado_registro || EstadoRegistroWhatsapp.DESCONOCIDO,
            primera_interaccion: now,
            ultima_interaccion: now,
        });
        return this.sesionRepo.save(sesion);
    }

    async findAll(limit = 50): Promise<SesionWhatsapp[]> {
        return this.sesionRepo.find({
            relations: ['usuario'],
            order: { ultima_interaccion: 'DESC' },
            take: limit,
        });
    }

    async findByWaId(waId: string): Promise<SesionWhatsapp | null> {
        return this.sesionRepo.findOne({
            where: { wa_id: waId },
            relations: ['usuario'],
        });
    }

    async findOne(sesionId: string): Promise<SesionWhatsapp> {
        const sesion = await this.sesionRepo.findOne({
            where: { sesion_wa_id: sesionId },
            relations: ['usuario'],
        });
        if (!sesion) throw new NotFoundException('Sesión WhatsApp no encontrada');
        return sesion;
    }

    async update(sesionId: string, dto: UpdateSesionWaDto): Promise<SesionWhatsapp> {
        const sesion = await this.findOne(sesionId);
        Object.assign(sesion, dto);
        sesion.ultima_interaccion = new Date();
        return this.sesionRepo.save(sesion);
    }

    async updateByWaId(waId: string, dto: UpdateSesionWaDto): Promise<SesionWhatsapp> {
        const sesion = await this.findByWaId(waId);
        if (!sesion) throw new NotFoundException(`Sesión con wa_id '${waId}' no encontrada`);
        Object.assign(sesion, dto);
        sesion.ultima_interaccion = new Date();
        return this.sesionRepo.save(sesion);
    }

    async remove(sesionId: string): Promise<void> {
        const sesion = await this.findOne(sesionId);
        await this.sesionRepo.remove(sesion);
    }

    async findOrCreate(waId: string, nombreMostrado?: string): Promise<SesionWhatsapp> {
        const existente = await this.findByWaId(waId);
        if (existente) {
            existente.ultima_interaccion = new Date();
            return this.sesionRepo.save(existente);
        }
        return this.create({ wa_id: waId, nombre_mostrado: nombreMostrado });
    }

    async getResumen(): Promise<{
        total: number;
        registrados: number;
        bloqueados: number;
        activos_24h: number;
    }> {
        const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [total, registrados, bloqueados] = await Promise.all([
            this.sesionRepo.count(),
            this.sesionRepo.count({ where: { estado_registro: EstadoRegistroWhatsapp.REGISTRADO } }),
            this.sesionRepo.count({ where: { esta_bloqueado: true } }),
        ]);
        const activos24h = await this.sesionRepo
            .createQueryBuilder('s')
            .where('s.ultima_interaccion >= :fecha', { fecha: hace24h })
            .getCount();

        return { total, registrados, bloqueados, activos_24h: activos24h };
    }

    async pausarBot(waId: string, minutosOrNull?: number): Promise<SesionWhatsapp> {
        const sesion = await this.findByWaId(waId);
        if (!sesion) throw new NotFoundException(`Sesión ${waId} no encontrada`);

        const pausadoHasta = minutosOrNull
            ? new Date(Date.now() + minutosOrNull * 60 * 1000)
            : null;

        Object.assign(sesion, {
            bot_pausado: true,
            bot_pausado_hasta: pausadoHasta,
            ultima_interaccion: new Date(),
        });
        return this.sesionRepo.save(sesion);
    }

    async reanudarBot(waId: string): Promise<SesionWhatsapp> {
        const sesion = await this.findByWaId(waId);
        if (!sesion) throw new NotFoundException(`Sesión ${waId} no encontrada`);

        Object.assign(sesion, {
            bot_pausado: false,
            bot_pausado_hasta: null,
            ultima_interaccion: new Date(),
        });
        return this.sesionRepo.save(sesion);
    }

    async getConversacionesActivas(): Promise<SesionWhatsapp[]> {
        const hace1h = new Date(Date.now() - 60 * 60 * 1000);
        return this.sesionRepo
            .createQueryBuilder('s')
            .leftJoinAndSelect('s.usuario', 'usuario')
            .where('s.ultima_interaccion >= :fecha', { fecha: hace1h })
            .orderBy('s.ultima_interaccion', 'DESC')
            .getMany();
    }

    async enviarMensajeManual(waId: string): Promise<{ enviado: boolean }> {
        const sesion = await this.findByWaId(waId);
        if (!sesion) throw new NotFoundException(`Sesión ${waId} no encontrada`);
        return { enviado: true };
    }
}