import {
    IsUUID, IsOptional, IsString, IsInt, IsEnum, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoIndexacion } from '@common/enums/enums';

export class CreateDocumentoDto {
    @ApiPropertyOptional({ example: 'uuid-parcela' })
    @IsOptional()
    @IsUUID()
    parcela_id?: string;

    @ApiProperty({ example: 'Guía de manejo integrado de plagas' })
    @IsString()
    @MaxLength(200)
    titulo: string;

    @ApiProperty({ example: 'guia_tecnica' })
    @IsString()
    @MaxLength(100)
    categoria: string;

    @ApiProperty({ example: '/uploads/docs/guia-plagas.pdf' })
    @IsString()
    @MaxLength(500)
    ruta_archivo: string;

    @ApiProperty({ example: 'pdf' })
    @IsString()
    @MaxLength(20)
    tipo_archivo: string;

    @ApiPropertyOptional({ example: 2048 })
    @IsOptional()
    @IsInt()
    tamano_kb?: number;

    @ApiPropertyOptional({ example: 'es', default: 'es' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    idioma?: string;

    @ApiPropertyOptional({ enum: EstadoIndexacion, default: EstadoIndexacion.PENDIENTE })
    @IsOptional()
    @IsEnum(EstadoIndexacion)
    estado_indexacion?: EstadoIndexacion;
}