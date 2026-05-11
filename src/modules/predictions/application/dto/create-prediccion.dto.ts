import {
    IsUUID,
    IsString,
    IsNumber,
    IsEnum,
    IsOptional,
    IsObject,
    IsDateString,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NivelRiesgo } from '@common/enums/enums';

export class CreatePrediccionDto {
    @ApiProperty({ example: 'uuid-parcela' })
    @IsUUID()
    parcela_id: string;

    @ApiPropertyOptional({ example: 'uuid-cultivo-parcela' })
    @IsOptional()
    @IsUUID()
    cultivo_parcela_id?: string;

    @ApiProperty({ example: 'uuid-tipo-cultivo' })
    @IsUUID()
    tipo_cultivo_id: string;

    @ApiProperty({ example: 'v1.2.0' })
    @IsString()
    @MaxLength(20)
    version_modelo: string;

    @ApiProperty({ example: 'random_forest' })
    @IsString()
    @MaxLength(30)
    tipo_modelo: string;

    @ApiProperty({ example: 4.85 })
    @IsNumber()
    rendimiento_predicho_ton: number;

    @ApiPropertyOptional({ example: 0.87 })
    @IsOptional()
    @IsNumber()
    puntaje_confianza?: number;

    @ApiPropertyOptional({ example: 3.90 })
    @IsOptional()
    @IsNumber()
    intervalo_conf_inferior?: number;

    @ApiPropertyOptional({ example: 5.80 })
    @IsOptional()
    @IsNumber()
    intervalo_conf_superior?: number;

    @ApiProperty({ enum: NivelRiesgo, example: NivelRiesgo.MEDIO })
    @IsEnum(NivelRiesgo)
    nivel_riesgo: NivelRiesgo;

    @ApiPropertyOptional({ description: 'Factores de riesgo identificados' })
    @IsOptional()
    @IsObject()
    factores_riesgo?: object;

    @ApiPropertyOptional({ description: 'Datos climáticos usados para la predicción' })
    @IsOptional()
    @IsObject()
    datos_clima_usados?: object;

    @ApiPropertyOptional({ description: 'Importancia de features del modelo' })
    @IsOptional()
    @IsObject()
    importancia_features?: object;

    @ApiProperty({ example: '2026-04-20T10:00:00Z' })
    @IsDateString()
    fecha_prediccion: string;
}