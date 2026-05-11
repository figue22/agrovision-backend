import {
    IsUUID, IsOptional, IsString, IsNumber, IsDateString, IsObject, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDatoClimaticoDto {
    @ApiProperty({ example: 'uuid-parcela' })
    @IsUUID()
    parcela_id: string;

    @ApiProperty({ example: '2026-04-20' })
    @IsDateString()
    fecha: string;

    @ApiPropertyOptional({ example: 28.5 })
    @IsOptional()
    @IsNumber()
    temp_maxima?: number;

    @ApiPropertyOptional({ example: 15.2 })
    @IsOptional()
    @IsNumber()
    temp_minima?: number;

    @ApiPropertyOptional({ example: 21.8 })
    @IsOptional()
    @IsNumber()
    temp_promedio?: number;

    @ApiPropertyOptional({ example: 12.5 })
    @IsOptional()
    @IsNumber()
    precipitacion_mm?: number;

    @ApiPropertyOptional({ example: 78.5 })
    @IsOptional()
    @IsNumber()
    humedad_pct?: number;

    @ApiPropertyOptional({ example: 15.3 })
    @IsOptional()
    @IsNumber()
    velocidad_viento?: number;

    @ApiPropertyOptional({ example: 7.2 })
    @IsOptional()
    @IsNumber()
    indice_uv?: number;

    @ApiPropertyOptional({ example: 45.0 })
    @IsOptional()
    @IsNumber()
    cobertura_nubes_pct?: number;

    @ApiProperty({ example: 'openweathermap' })
    @IsString()
    @MaxLength(50)
    fuente: string;

    @ApiPropertyOptional({ description: 'Datos crudos del API externo' })
    @IsOptional()
    @IsObject()
    datos_crudos?: object;
}