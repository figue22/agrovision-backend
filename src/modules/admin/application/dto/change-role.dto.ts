import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { Rol } from '@common/enums/enums';

export class ChangeRoleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID del usuario' })
  @IsUUID('4', { message: 'El usuario_id debe ser un UUID válido' })
  @IsNotEmpty()
  usuario_id: string;

  @ApiProperty({ enum: Rol, example: Rol.TECNICO, description: 'Nuevo rol a asignar' })
  @IsEnum(Rol, { message: 'El rol debe ser: admin, tecnico o agricultor' })
  @IsNotEmpty()
  nuevo_rol: Rol;
}
