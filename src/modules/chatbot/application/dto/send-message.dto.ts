import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
    @ApiProperty({ example: '¿Cuándo debo regar mi cultivo de café?' })
    @IsString()
    @MaxLength(2000)
    mensaje: string;

    @ApiPropertyOptional({ example: 'uuid-parcela', description: 'Contexto de parcela específica' })
    @IsOptional()
    @IsUUID()
    parcela_id?: string;

    @ApiPropertyOptional({ example: 'conv-uuid', description: 'ID de conversación para mantener contexto' })
    @IsOptional()
    @IsString()
    conversacion_id?: string;
}