import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';

export class ToggleUserStatusDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'El usuario_id debe ser un UUID válido' })
  @IsNotEmpty()
  usuario_id: string;

  @ApiProperty({ example: false, description: 'true = activar, false = desactivar' })
  @IsBoolean()
  @IsNotEmpty()
  esta_activo: boolean;
}
