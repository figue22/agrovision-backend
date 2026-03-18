import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@common/enums/enums';

export class AgricultorResponseDto {
  @ApiProperty()
  agricultor_id: string;

  @ApiProperty()
  cedula: string;

  @ApiPropertyOptional()
  direccion?: string;

  @ApiProperty()
  municipio: string;

  @ApiProperty()
  departamento: string;

  @ApiPropertyOptional()
  tamano_finca_ha?: number;

  @ApiProperty()
  creado_en: Date;
}

export class UsuarioResponseDto {
  @ApiProperty()
  usuario_id: string;

  @ApiProperty()
  correo: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  apellido: string;

  @ApiPropertyOptional()
  telefono?: string;

  @ApiProperty({ enum: Rol })
  rol: Rol;

  @ApiProperty()
  tiene_2fa: boolean;

  @ApiProperty()
  esta_activo: boolean;

  @ApiPropertyOptional()
  ultimo_login?: Date;

  @ApiProperty()
  creado_en: Date;

  @ApiPropertyOptional({ type: AgricultorResponseDto })
  agricultor?: AgricultorResponseDto;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty({ type: UsuarioResponseDto })
  usuario: UsuarioResponseDto;
}
