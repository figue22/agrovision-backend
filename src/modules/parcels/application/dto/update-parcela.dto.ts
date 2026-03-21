import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoSuelo } from '@common/enums/enums';
import { UbicacionDto } from './create-parcela.dto';

export class UpdateParcelaDto {
  @ApiPropertyOptional({ example: 'Parcela San José — Lote 2' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ type: UbicacionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UbicacionDto)
  ubicacion?: UbicacionDto;

  @ApiPropertyOptional({ example: 4.2 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  area_hectareas?: number;

  @ApiPropertyOptional({ enum: TipoSuelo })
  @IsOptional()
  @IsEnum(TipoSuelo)
  tipo_suelo?: TipoSuelo;

  @ApiPropertyOptional({ example: 6.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph_suelo?: number;

  @ApiPropertyOptional({ example: 1580 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  altitud_msnm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limites_geojson?: { type: 'Polygon'; coordinates: number[][][] };
}
