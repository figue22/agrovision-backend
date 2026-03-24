import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { RequerimientoAgua } from '@common/enums/enums';

export class CreateTipoCultivoDto {
  @ApiProperty({ example: 'Café arábica' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Coffea arabica' })
  @IsOptional()
  @IsString()
  nombre_cientifico?: string;

  @ApiPropertyOptional({ example: 'fruta', description: 'cereal, legumbre, hortaliza, fruta, tubérculo' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ example: 365, description: 'Días promedio desde siembra hasta cosecha' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  dias_crecimiento_prom?: number;

  @ApiPropertyOptional({ example: 18.0 })
  @IsOptional()
  @IsNumber()
  temp_optima_min?: number;

  @ApiPropertyOptional({ example: 24.0 })
  @IsOptional()
  @IsNumber()
  temp_optima_max?: number;

  @ApiPropertyOptional({ example: 0, description: 'Altitud mínima en msnm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  altitud_optima_min?: number;

  @ApiPropertyOptional({ example: 1800, description: 'Altitud máxima en msnm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  altitud_optima_max?: number;

  @ApiPropertyOptional({ example: 5.5, description: 'pH mínimo óptimo (0-14)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph_optimo_min?: number;

  @ApiPropertyOptional({ example: 7.0, description: 'pH máximo óptimo (0-14)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph_optimo_max?: number;

  @ApiPropertyOptional({ enum: RequerimientoAgua, example: RequerimientoAgua.ALTO })
  @IsOptional()
  @IsEnum(RequerimientoAgua)
  req_agua?: RequerimientoAgua;
}
