import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { EstadoCultivo } from '@common/enums/enums';

export class CreateCultivoParcelaDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID de la parcela' })
  @IsUUID('4', { message: 'parcela_id debe ser un UUID válido' })
  @IsNotEmpty()
  parcela_id: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001', description: 'UUID del tipo de cultivo' })
  @IsUUID('4', { message: 'tipo_cultivo_id debe ser un UUID válido' })
  @IsNotEmpty()
  tipo_cultivo_id: string;

  @ApiProperty({ example: '2026-03-15', description: 'Fecha de siembra (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'fecha_siembra debe ser una fecha válida (YYYY-MM-DD)' })
  @IsNotEmpty()
  fecha_siembra: string;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional()
  @IsDateString()
  fecha_cosecha_esperada?: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Área sembrada en hectáreas' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  area_sembrada_ha?: number;

  @ApiPropertyOptional({ example: 4.0, description: 'Rendimiento esperado en toneladas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rendimiento_esperado_ton?: number;

  @ApiPropertyOptional({ enum: EstadoCultivo, example: EstadoCultivo.PLANIFICADO })
  @IsOptional()
  @IsEnum(EstadoCultivo)
  estado?: EstadoCultivo;

  @ApiPropertyOptional({ example: '2026-A', description: 'Temporada agrícola' })
  @IsOptional()
  @IsString()
  temporada?: string;

  @ApiPropertyOptional({ example: 'Semilla certificada, lote #2847' })
  @IsOptional()
  @IsString()
  notas?: string;
}
