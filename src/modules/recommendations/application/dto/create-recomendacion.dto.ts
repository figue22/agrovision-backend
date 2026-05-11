import {
    IsUUID, IsInt, IsOptional, IsString, IsEnum, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prioridad } from '@common/enums/enums';

export class CreateRecomendacionDto {
    @ApiProperty({ example: 'uuid-prediccion' })
    @IsUUID()
    prediccion_id: string;

    @ApiPropertyOptional({ example: 'uuid-documento' })
    @IsOptional()
    @IsUUID()
    documento_fuente_id?: string;

    @ApiProperty({ example: 1, description: 'ID del cat_tipos_recomendacion' })
    @IsInt()
    tipo_recomendacion_id: number;

    @ApiProperty({ enum: Prioridad, example: Prioridad.ALTA })
    @IsEnum(Prioridad)
    prioridad: Prioridad;

    @ApiProperty({ example: 'Aumentar riego en próximos 5 días' })
    @IsString()
    @MaxLength(200)
    titulo: string;

    @ApiProperty({ example: 'Debido a las altas temperaturas previstas, se recomienda...' })
    @IsString()
    descripcion: string;
}