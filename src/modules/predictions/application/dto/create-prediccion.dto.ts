import {
    IsUUID,
    IsOptional,
    IsObject,
    IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoModeloDto {
    XGBOOST = 'xgboost',
    LSTM = 'lstm',
    ENSEMBLE = 'ensemble',
}

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

    @ApiPropertyOptional({ enum: TipoModeloDto, default: TipoModeloDto.ENSEMBLE })
    @IsOptional()
    @IsEnum(TipoModeloDto)
    modelo?: TipoModeloDto;

    @ApiPropertyOptional({ description: 'Datos agronómicos y climáticos para la predicción' })
    @IsOptional()
    @IsObject()
    datos_agronomicos?: object;
}