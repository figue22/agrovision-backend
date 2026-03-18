import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';

interface JwtPayload {
  sub: string;
  correo: string;
  rol: string;
  tipo: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<Usuario> {
    if (payload.tipo !== 'access') {
      throw new UnauthorizedException('Token inválido');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { usuario_id: payload.sub },
    });

    if (!usuario || !usuario.esta_activo) {
      throw new UnauthorizedException('Usuario no encontrado o deshabilitado');
    }

    return usuario;
  }
}
