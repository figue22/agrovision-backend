import {
    IsUUID,
    IsInt,
    IsOptional,
    IsString,
    IsNumber,
    IsDateString,
    IsArray,
    ValidateNested,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInsumoDto {
    @ApiProperty({ example: 'Urea granulada' })
    @IsString()
    @MaxLength(150)
    nombre_insumo: string;

    @ApiProperty({ example: 1, description: 'ID del cat_tipos_insumo' })
    @IsInt()
    tipo_insumo_id: number;

    @ApiProperty({ example: 50 })
    @IsNumber()
    cantidad: number;

    @ApiProperty({ example: 'kg' })
    @IsString()
    @MaxLength(20)
    unidad: string;

    @ApiPropertyOptional({ example: 85000 })
    @IsOptional()
    @IsNumber()
    costo_unitario_cop?: number;

    @ApiPropertyOptional({ example: 'Monómeros' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    marca?: string;
}

export class CreateActividadDto {
    @ApiProperty({ example: 'uuid-parcela', description: 'ID de la parcela' })
    @IsUUID()
    parcela_id: string;

    @ApiProperty({ example: 1, description: 'ID del cat_tipos_actividad' })
    @IsInt()
    tipo_actividad_id: number;

    @ApiPropertyOptional({ example: 'Fertilización foliar con urea' })
    @IsOptional()
    @IsString()
    descripcion?: string;

    @ApiPropertyOptional({ example: 100 })
    @IsOptional()
    @IsNumber()
    cantidad?: number;

    @ApiPropertyOptional({ example: 'kg' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    unidad?: string;

    @ApiPropertyOptional({ example: 250000 })
    @IsOptional()
    @IsNumber()
    costo_cop?: number;

    @ApiProperty({ example: '2026-04-20' })
    @IsDateString()
    fecha_realizacion: string;

    @ApiPropertyOptional({ example: 'Se aplicó en horas de la mañana' })
    @IsOptional()
    @IsString()
    notas?: string;

    @ApiPropertyOptional({ type: [CreateInsumoDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInsumoDto)
    insumos?: CreateInsumoDto[];
}