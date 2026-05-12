import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Enable2faResponseDto {
  @ApiProperty({ description: 'Secret TOTP para guardar en app autenticadora' })
  secret: string;

  @ApiProperty({ description: 'URL otpauth:// para generar QR' })
  otpauth_url: string;

  @ApiProperty({ description: 'Imagen QR en base64 (data:image/png;base64,...)' })
  qr_code: string;
}

export class Verify2faDto {
  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos de la app autenticadora' })
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  codigo: string;
}

export class Login2faDto {
  @ApiProperty({ example: 'juan.figueroa@correo.com' })
  @IsString()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({ example: 'MiClave#2026' })
  @IsString()
  @IsNotEmpty()
  contrasena: string;

  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  codigo_2fa: string;
}