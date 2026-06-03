import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CreatePrediccionDto } from '@modules/predictions/application/dto/create-prediccion.dto';
import { UpdatePrediccionDto } from '@modules/predictions/application/dto/update-prediccion.dto';
import { MlService } from '@modules/predictions/application/use-cases/ml.service';
import { Rol, NivelRiesgo } from '@common/enums/enums';

@Injectable()
export class PredictionsService {
    private readonly logger = new Logger(PredictionsService.name);

    constructor(
        @InjectRepository(Prediccion)
        private readonly prediccionRepo: Repository<Prediccion>,
        @InjectRepository(Parcela)
        private readonly parcelaRepo: Repository<Parcela>,
        private readonly mlService: MlService,
    ) {}

    private async verificarAccesoParcela(parcelaId: string, usuarioId: string, rol: Rol): Promise<void> {
        const parcela = await this.parcelaRepo.findOne({
            where: { parcela_id: parcelaId },
            relations: ['agricultor'],
        });
        if (!parcela) throw new NotFoundException('Parcela no encontrada');
        if (rol === Rol.AGRICULTOR && parcela.agricultor?.usuario_id !== usuarioId) {
            throw new ForbiddenException('No tienes acceso a esta parcela');
        }
    }

    async create(dto: CreatePrediccionDto, usuarioId: string, rol: Rol): Promise<Prediccion> {
        const parcela = await this.parcelaRepo.findOne({ where: { parcela_id: dto.parcela_id } });
        if (!parcela) throw new NotFoundException('Parcela no encontrada');

        await this.verificarAccesoParcela(dto.parcela_id, usuarioId, rol);

        // Llamar al servicio ML
        let mlResult: any = null;
        try {
            mlResult = await this.mlService.predict({
                parcela_id: dto.parcela_id,
                cultivo_parcela_id: dto.cultivo_parcela_id || '',
                tipo_cultivo_id: dto.tipo_cultivo_id,
                modelo: dto.modelo || 'ensemble',
                datos_agronomicos: (dto.datos_agronomicos || {}) as any,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error llamando al ML: ${msg}`);
        }

        // Guardar predicción con resultado del ML o valores por defecto
        const prediccion = this.prediccionRepo.create({
            parcela_id: dto.parcela_id,
            cultivo_parcela_id: dto.cultivo_parcela_id,
            tipo_cultivo_id: dto.tipo_cultivo_id,
            version_modelo: mlResult?.version_modelo || '1.0.0',
            tipo_modelo: mlResult?.tipo_modelo || dto.modelo || 'ensemble',
            rendimiento_predicho_ton: mlResult?.rendimiento_predicho_ton || 0,
            puntaje_confianza: mlResult?.puntaje_confianza || 0,
            intervalo_conf_inferior: mlResult?.intervalo_conf_inferior || 0,
            intervalo_conf_superior: mlResult?.intervalo_conf_superior || 0,
            nivel_riesgo: (mlResult?.nivel_riesgo as NivelRiesgo) || NivelRiesgo.MEDIO,
            factores_riesgo: mlResult?.factores_riesgo || {},
            datos_clima_usados: mlResult?.datos_clima_usados || {},
            importancia_features: mlResult?.importancia_features || {},
            fecha_prediccion: mlResult?.fecha_prediccion ? new Date(mlResult.fecha_prediccion) : new Date(),
        });

        return this.prediccionRepo.save(prediccion);
    }

    async findByParcela(parcelaId: string, usuarioId: string, rol: Rol): Promise<Prediccion[]> {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);
        return this.prediccionRepo.find({
            where: { parcela_id: parcelaId },
            relations: ['tipoCultivo', 'cultivoParcela', 'recomendaciones'],
            order: { fecha_prediccion: 'DESC' },
        });
    }

    async findLatestByParcela(parcelaId: string, usuarioId: string, rol: Rol): Promise<Prediccion | null> {
        await this.verificarAccesoParcela(parcelaId, usuarioId, rol);
        return this.prediccionRepo.findOne({
            where: { parcela_id: parcelaId },
            relations: ['tipoCultivo', 'cultivoParcela', 'recomendaciones', 'recomendaciones.tipoRecomendacion'],
            order: { fecha_prediccion: 'DESC' },
        });
    }

    async findOne(prediccionId: string, usuarioId: string, rol: Rol): Promise<Prediccion> {
        const prediccion = await this.prediccionRepo.findOne({
            where: { prediccion_id: prediccionId },
            relations: ['tipoCultivo', 'cultivoParcela', 'parcela', 'recomendaciones', 'recomendaciones.tipoRecomendacion'],
        });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        await this.verificarAccesoParcela(prediccion.parcela_id, usuarioId, rol);
        return prediccion;
    }

    async update(prediccionId: string, dto: UpdatePrediccionDto): Promise<Prediccion> {
        const prediccion = await this.prediccionRepo.findOne({ where: { prediccion_id: prediccionId } });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        Object.assign(prediccion, dto);
        return this.prediccionRepo.save(prediccion);
    }

    async remove(prediccionId: string): Promise<void> {
        const prediccion = await this.prediccionRepo.findOne({ where: { prediccion_id: prediccionId } });
        if (!prediccion) throw new NotFoundException('Predicción no encontrada');
        await this.prediccionRepo.remove(prediccion);
    }

    async findAll(limit = 50): Promise<Prediccion[]> {
        return this.prediccionRepo.find({
            relations: ['tipoCultivo', 'parcela'],
            order: { fecha_prediccion: 'DESC' },
            take: limit,
        });
    }
}