import {
    IsUUID, IsOptional, IsString, IsObject, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLogDto {
    @ApiPropertyOptional({ example: 'uuid-usuario' })
    @IsOptional()
    @IsUUID()
    usuario_id?: string;

    @ApiProperty({ example: 'CREATE' })
    @IsString()
    @MaxLength(50)
    accion: string;

    @ApiProperty({ example: 'parcela' })
    @IsString()
    @MaxLength(50)
    tipo_entidad: string;

    @ApiPropertyOptional({ example: 'uuid-entidad' })
    @IsOptional()
    @IsUUID()
    id_entidad?: string;

    @ApiPropertyOptional({ description: 'Estado anterior del registro' })
    @IsOptional()
    @IsObject()
    valores_anteriores?: object;

    @ApiPropertyOptional({ description: 'Estado nuevo del registro' })
    @IsOptional()
    @IsObject()
    valores_nuevos?: object;

    @ApiPropertyOptional({ example: '192.168.1.1' })
    @IsOptional()
    @IsString()
    direccion_ip?: string;

    @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
    @IsOptional()
    @IsString()
    agente_usuario?: string;

    @ApiPropertyOptional({ example: 'POST' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    metodo_http?: string;

    @ApiPropertyOptional({ example: '/api/v1/parcels' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    ruta_endpoint?: string;
}