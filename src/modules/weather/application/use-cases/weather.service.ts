import {
    Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CreateDatoClimaticoDto } from '@modules/weather/application/dto/create-dato-climatico.dto';
import { UpdateDatoClimaticoDto } from '@modules/weather/application/dto/update-dato-climatico.dto';
import { Rol } from '@common/enums/enums';

@Injectable()
export class WeatherService {
    constructor(
        @InjectRepository(DatoClimatico)
        private readonly datoClimaticoRepo: Repository<DatoClimatico>,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
    ) { }

    public async verificarAcceso(parcelaId: string, usuarioId: string, rol: string): Promise<void> {
        const parcela = await this.parcelaRepo.findOne({
            where: { parcela_id: parcelaId },
            relations: ['agricultor'],
        });
        if (!parcela) throw new NotFoundException('Parcela no encontrada');
        if (rol === Rol.AGRICULTOR && parcela.agricultor?.usuario_id !== usuarioId) {
            throw new ForbiddenException('No tienes acceso a esta parcela');
        }
    }

    async create(dto: CreateDatoClimaticoDto): Promise<DatoClimatico> {
        const parcela = await this.parcelaRepo.findOne({ where: { parcela_id: dto.parcela_id } });
        if (!parcela) throw new NotFoundException('Parcela no encontrada');
        const dato = this.datoClimaticoRepo.create(dto);
        return this.datoClimaticoRepo.save(dato);
    }

    async findByParcela(
        parcelaId: string,
        usuarioId: string,
        rol: string,
        limit = 30,
    ): Promise<DatoClimatico[]> {
    await this.verificarAcceso(parcelaId, usuarioId, rol);

    return this.datoClimaticoRepo.find({
        where: [
        { parcela_id: parcelaId, fuente: 'openweathermap' },
        { parcela_id: parcelaId, fuente: 'ideam' },
        ],
        order: { fecha: 'DESC' },
        take: limit,
    });
    }

    async findByDateRange(parcelaId: string, fechaInicio: string, fechaFin: string, usuarioId: string, rol: string): Promise<DatoClimatico[]> {
        await this.verificarAcceso(parcelaId, usuarioId, rol);
        return this.datoClimaticoRepo.find({
            where: { parcela_id: parcelaId, fecha: Between(new Date(fechaInicio), new Date(fechaFin)) },
            order: { fecha: 'ASC' },
        });
    }

    async findOne(datoId: string, usuarioId: string, rol: string): Promise<DatoClimatico> {
        const dato = await this.datoClimaticoRepo.findOne({
            where: { dato_climatico_id: datoId },
            relations: ['parcela'],
        });
        if (!dato) throw new NotFoundException('Dato climático no encontrado');
        await this.verificarAcceso(dato.parcela_id, usuarioId, rol);
        return dato;
    }

    async update(datoId: string, usuarioId: string, rol: string, dto: UpdateDatoClimaticoDto): Promise<DatoClimatico> {
        const dato = await this.findOne(datoId, usuarioId, rol);
        Object.assign(dato, dto);
        return this.datoClimaticoRepo.save(dato);
    }

    async remove(datoId: string, usuarioId: string, rol: string): Promise<void> {
        const dato = await this.findOne(datoId, usuarioId, rol);
        await this.datoClimaticoRepo.remove(dato);
    }

    async getUltimo(
        parcelaId: string,
        usuarioId: string,
        rol: string,
    ): Promise<DatoClimatico | null> {
        await this.verificarAcceso(parcelaId, usuarioId, rol);

        return this.datoClimaticoRepo.findOne({
            where: { 
            parcela_id: parcelaId,
            fuente: 'openweathermap',
            },
            order: { fecha: 'DESC' },
        });
    }

    async getPromedios(parcelaId: string, fechaInicio: string, fechaFin: string, usuarioId: string, rol: string) {
        await this.verificarAcceso(parcelaId, usuarioId, rol);
        const datos = await this.datoClimaticoRepo.find({
            where: { parcela_id: parcelaId, fecha: Between(new Date(fechaInicio), new Date(fechaFin)) },
        });
        if (datos.length === 0) return { temp_promedio: 0, precipitacion_total: 0, humedad_promedio: 0, dias_registrados: 0 };

        const tempSum = datos.reduce((s, d) => s + (Number(d.temp_promedio) || 0), 0);
        const precTotal = datos.reduce((s, d) => s + (Number(d.precipitacion_mm) || 0), 0);
        const humSum = datos.reduce((s, d) => s + (Number(d.humedad_pct) || 0), 0);

        return {
            temp_promedio: Math.round((tempSum / datos.length) * 100) / 100,
            precipitacion_total: Math.round(precTotal * 100) / 100,
            humedad_promedio: Math.round((humSum / datos.length) * 100) / 100,
            dias_registrados: datos.length,
        };
    }
}