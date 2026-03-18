import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { UsuarioResponseDto } from '@modules/auth/application/dto';

export class AuthMapper {
  static toResponseDto(usuario: Usuario): UsuarioResponseDto {
    const dto = new UsuarioResponseDto();
    dto.usuario_id = usuario.usuario_id;
    dto.correo = usuario.correo;
    dto.nombre = usuario.nombre;
    dto.apellido = usuario.apellido;
    dto.telefono = usuario.telefono;
    dto.rol = usuario.rol;
    dto.tiene_2fa = usuario.tiene_2fa;
    dto.esta_activo = usuario.esta_activo;
    dto.ultimo_login = usuario.ultimo_login;
    dto.creado_en = usuario.creado_en;
    return dto;
  }
}
