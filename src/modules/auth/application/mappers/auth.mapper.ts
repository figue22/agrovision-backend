import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { UsuarioResponseDto, AgricultorResponseDto } from '@modules/auth/application/dto';

export class AuthMapper {
  static toResponseDto(usuario: Usuario, agricultor?: Agricultor | null): UsuarioResponseDto {
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

    if (agricultor) {
      dto.agricultor = this.toAgricultorDto(agricultor);
    }

    return dto;
  }

  static toAgricultorDto(agricultor: Agricultor): AgricultorResponseDto {
    const dto = new AgricultorResponseDto();
    dto.agricultor_id = agricultor.agricultor_id;
    dto.cedula = agricultor.cedula;
    dto.direccion = agricultor.direccion;
    dto.municipio = agricultor.municipio;
    dto.departamento = agricultor.departamento;
    dto.tamano_finca_ha = agricultor.tamano_finca_ha;
    dto.creado_en = agricultor.creado_en;
    return dto;
  }
}
