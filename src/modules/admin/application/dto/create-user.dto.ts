import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Rol } from '@common/enums/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'tecnico@agrovision.com' })
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({ example: 'TecnicoClave#2026' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
  contrasena: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Ramírez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiPropertyOptional({ example: '+573009999999' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ enum: Rol, example: Rol.TECNICO })
  @IsEnum(Rol)
  @IsNotEmpty()
  rol: Rol;
}