import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AsignarAgricultorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID del técnico' })
  @IsUUID('4', { message: 'El tecnico_id debe ser un UUID válido' })
  @IsNotEmpty()
  tecnico_id: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001', description: 'UUID del agricultor' })
  @IsUUID('4', { message: 'El agricultor_id debe ser un UUID válido' })
  @IsNotEmpty()
  agricultor_id: string;

  @ApiPropertyOptional({ example: 'Asignado para seguimiento de cultivos de café' })
  @IsOptional()
  @IsString()
  notas?: string;
}

export class DesasignarAgricultorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  @IsNotEmpty()
  tecnico_id: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  @IsUUID('4')
  @IsNotEmpty()
  agricultor_id: string;
}
