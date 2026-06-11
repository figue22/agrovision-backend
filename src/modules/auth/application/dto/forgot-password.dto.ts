import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'juan.figueroa@correo.com' })
  @IsEmail({}, { message: 'El correo debe ser válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo' })
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio' })
  token: string;

  @ApiProperty({ example: 'NuevaClave#2026', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos: 1 mayúscula, 1 minúscula y 1 número',
  })
  nueva_contrasena: string;
}