import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { RequerimientoAgua } from '@common/enums/enums';

export class UpdateTipoCultivoDto {
  @ApiPropertyOptional({ example: 'Café arábica' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Coffea arabica' })
  @IsOptional()
  @IsString()
  nombre_cientifico?: string;

  @ApiPropertyOptional({ example: 'fruta' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ example: 365 })
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

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  altitud_optima_min?: number;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  altitud_optima_max?: number;

  @ApiPropertyOptional({ example: 5.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph_optimo_min?: number;

  @ApiPropertyOptional({ example: 7.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph_optimo_max?: number;

  @ApiPropertyOptional({ enum: RequerimientoAgua })
  @IsOptional()
  @IsEnum(RequerimientoAgua)
  req_agua?: RequerimientoAgua;
}
