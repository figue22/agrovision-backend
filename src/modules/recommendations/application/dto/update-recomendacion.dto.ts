import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoImplementacion } from '@common/enums/enums';

export class UpdateRecomendacionDto {
    @ApiPropertyOptional({ enum: EstadoImplementacion })
    @IsOptional()
    @IsEnum(EstadoImplementacion)
    estado_implementacion?: EstadoImplementacion;

    @ApiPropertyOptional({ example: '2026-04-22T10:00:00Z' })
    @IsOptional()
    @IsDateString()
    fecha_implementacion?: string;

    @ApiPropertyOptional({ example: 'Funcionó muy bien, el cultivo mejoró' })
    @IsOptional()
    @IsString()
    feedback_agricultor?: string;

    @ApiPropertyOptional({ example: 4, description: '1-5 estrellas' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    calificacion_eficacia?: number;
}