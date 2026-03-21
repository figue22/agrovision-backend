import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoSuelo } from '@common/enums/enums';

export class ParcelaResponseDto {
  @ApiProperty()
  parcela_id: string;

  @ApiProperty()
  agricultor_id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ example: { latitud: 5.0689, longitud: -75.5174 } })
  ubicacion: { latitud: number; longitud: number };

  @ApiProperty()
  area_hectareas: number;

  @ApiPropertyOptional({ enum: TipoSuelo })
  tipo_suelo?: TipoSuelo;

  @ApiPropertyOptional()
  ph_suelo?: number;

  @ApiPropertyOptional()
  altitud_msnm?: number;

  @ApiPropertyOptional()
  limites_geojson?: object;

  @ApiProperty()
  creado_en: Date;

  @ApiProperty()
  actualizado_en: Date;

  @ApiPropertyOptional()
  agricultor?: {
    agricultor_id: string;
    cedula: string;
    municipio: string;
    departamento: string;
    usuario?: {
      nombre: string;
      apellido: string;
      correo: string;
    };
  };
}