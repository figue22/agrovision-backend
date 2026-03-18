import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class UpdateAgricultorDto {
  @ApiPropertyOptional({ example: 'Vereda La Esperanza, Km 5 vía Chinchiná' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ example: 'Chinchiná' })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({ example: 'Caldas' })
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional({ example: 5.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tamano_finca_ha?: number;
}
