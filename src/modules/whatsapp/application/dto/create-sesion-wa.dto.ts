import {
    IsString, IsOptional, IsUUID, IsEnum, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoRegistroWhatsapp } from '@common/enums/enums';

export class CreateSesionWaDto {
    @ApiProperty({ example: '573001234567', description: 'Número WhatsApp con código país' })
    @IsString()
    @MaxLength(20)
    wa_id: string;

    @ApiPropertyOptional({ example: 'Juan Pérez' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nombre_mostrado?: string;

    @ApiPropertyOptional({ example: 'uuid-usuario' })
    @IsOptional()
    @IsUUID()
    usuario_id?: string;

    @ApiPropertyOptional({ enum: EstadoRegistroWhatsapp, default: EstadoRegistroWhatsapp.DESCONOCIDO })
    @IsOptional()
    @IsEnum(EstadoRegistroWhatsapp)
    estado_registro?: EstadoRegistroWhatsapp;

    @ApiPropertyOptional({ example: 'es', default: 'es' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    idioma_preferido?: string;
}