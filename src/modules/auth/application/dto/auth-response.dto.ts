import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '@common/enums/enums';

export class UsuarioResponseDto {
  @ApiProperty()
  usuario_id: string;

  @ApiProperty()
  correo: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  apellido: string;

  @ApiProperty({ required: false })
  telefono?: string;

  @ApiProperty({ enum: Rol })
  rol: Rol;

  @ApiProperty()
  tiene_2fa: boolean;

  @ApiProperty()
  esta_activo: boolean;

  @ApiProperty({ required: false })
  ultimo_login?: Date;

  @ApiProperty()
  creado_en: Date;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty({ type: UsuarioResponseDto })
  usuario: UsuarioResponseDto;
}
