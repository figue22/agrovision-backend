import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { EstadoCultivo } from '@common/enums/enums';

export class UpdateCultivoParcelaDto {
  @ApiPropertyOptional({ example: '2026-12-20' })
  @IsOptional()
  @IsDateString()
  fecha_cosecha_esperada?: string;

  @ApiPropertyOptional({ example: '2026-12-18' })
  @IsOptional()
  @IsDateString()
  fecha_cosecha_real?: string;

  @ApiPropertyOptional({ example: 2.8 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  area_sembrada_ha?: number;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rendimiento_esperado_ton?: number;

  @ApiPropertyOptional({ example: 3.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rendimiento_real_ton?: number;

  @ApiPropertyOptional({ enum: EstadoCultivo, example: EstadoCultivo.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoCultivo)
  estado?: EstadoCultivo;

  @ApiPropertyOptional({ example: '2026-A' })
  @IsOptional()
  @IsString()
  temporada?: string;

  @ApiPropertyOptional({ example: 'Se aplicó fertilizante NPK en semana 4' })
  @IsOptional()
  @IsString()
  notas?: string;
}
