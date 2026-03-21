import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
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

export class UbicacionDto {
  @ApiProperty({ example: 5.0689, description: 'Latitud GPS' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud: number;

  @ApiProperty({ example: -75.5174, description: 'Longitud GPS' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud: number;
}

export class CreateParcelaDto {
  @ApiProperty({ example: 'Parcela San José' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({ type: UbicacionDto, description: 'Coordenadas GPS capturadas automáticamente' })
  @ValidateNested()
  @Type(() => UbicacionDto)
  @IsNotEmpty({ message: 'La ubicación es obligatoria' })
  ubicacion: UbicacionDto;

  @ApiProperty({ example: 3.5, description: 'Área en hectáreas' })
  @IsNumber()
  @Min(0.01, { message: 'El área debe ser mayor a 0' })
  area_hectareas: number;

  @ApiPropertyOptional({ enum: TipoSuelo, example: TipoSuelo.FRANCO })
  @IsOptional()
  @IsEnum(TipoSuelo, { message: 'Tipo de suelo inválido' })
  tipo_suelo?: TipoSuelo;

  @ApiPropertyOptional({ example: 6.5, description: 'pH del suelo (0-14)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph_suelo?: number;

  @ApiPropertyOptional({ example: 1520, description: 'Altitud en metros sobre nivel del mar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  altitud_msnm?: number;

  @ApiPropertyOptional({
    example: { type: 'Polygon', coordinates: [[[5.06, -75.51], [5.07, -75.51], [5.07, -75.52], [5.06, -75.52], [5.06, -75.51]]] },
    description: 'Límites de la parcela en formato GeoJSON Polygon',
  })
  @IsOptional()
  limites_geojson?: { type: 'Polygon'; coordinates: number[][][] };
}
