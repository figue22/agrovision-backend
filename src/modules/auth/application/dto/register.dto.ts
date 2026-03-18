import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MinLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DatosAgricultorDto {
  @ApiProperty({ example: '1053845678', description: 'Cédula de ciudadanía' })
  @IsString()
  @IsNotEmpty({ message: 'La cédula es obligatoria' })
  cedula: string;

  @ApiPropertyOptional({ example: 'Vereda La Esperanza, Km 5' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ example: 'Manizales' })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio' })
  municipio: string;

  @ApiProperty({ example: 'Caldas' })
  @IsString()
  @IsNotEmpty({ message: 'El departamento es obligatorio' })
  departamento: string;

  @ApiPropertyOptional({ example: 3.5, description: 'Tamaño de finca en hectáreas' })
  @IsOptional()
  @IsNumber({}, { message: 'El tamaño de finca debe ser un número' })
  @Min(0, { message: 'El tamaño de finca debe ser positivo' })
  tamano_finca_ha?: number;
}

export class RegisterDto {
  @ApiProperty({ example: 'juan.figueroa@correo.com' })
  @IsEmail({}, { message: 'El correo debe ser válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo: string;

  @ApiProperty({ example: 'MiClave#2026', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
    message:
      'La contraseña debe tener al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
  })
  contrasena: string;

  @ApiProperty({ example: 'Juan Manuel' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({ example: 'Figueroa Valencia' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    type: DatosAgricultorDto,
    description: 'Datos del agricultor. Si se envía, el usuario se registra como agricultor.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosAgricultorDto)
  agricultor?: DatosAgricultorDto;
}
