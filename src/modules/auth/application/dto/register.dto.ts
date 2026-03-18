import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ example: '+573001234567', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ enum: Rol, example: Rol.AGRICULTOR, required: false })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser: admin, tecnico o agricultor' })
  rol?: Rol;
}
