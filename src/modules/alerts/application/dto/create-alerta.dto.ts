import {
    IsUUID, IsInt, IsOptional, IsString, IsEnum, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Severidad } from '@common/enums/enums';

export class CreateAlertaDto {
    @ApiPropertyOptional({ example: 'uuid-parcela' })
    @IsOptional()
    @IsUUID()
    parcela_id?: string;

    @ApiProperty({ example: 'uuid-usuario', description: 'Usuario destinatario' })
    @IsUUID()
    usuario_id: string;

    @ApiProperty({ example: 1, description: 'ID del cat_tipos_alerta' })
    @IsInt()
    tipo_alerta_id: number;

    @ApiProperty({ enum: Severidad, example: Severidad.ALTA })
    @IsEnum(Severidad)
    severidad: Severidad;

    @ApiProperty({ example: 'Alerta de helada' })
    @IsString()
    @MaxLength(200)
    titulo: string;

    @ApiProperty({ example: 'Se esperan temperaturas bajo 0°C esta noche' })
    @IsString()
    mensaje: string;

    @ApiPropertyOptional({ example: 'Cubrir los cultivos con plástico' })
    @IsOptional()
    @IsString()
    accion_requerida?: string;

    @ApiPropertyOptional({ example: '2026-04-25T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    expira_en?: string;
}