import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCatalogDto {
  @ApiProperty({ example: 'riego', description: 'Código único del catálogo' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  codigo: string;

  @ApiProperty({ example: 'Riego', description: 'Nombre del catálogo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Aplicación de agua al cultivo' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}