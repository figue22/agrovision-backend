import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
    @ApiProperty({ example: '¿Cuándo debo fertilizar mi cultivo de plátano?' })
    @IsString()
    @MaxLength(2000)
    mensaje: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    conversacion_id?: string;

    @ApiPropertyOptional({ example: 'platano' })
    @IsOptional()
    @IsString()
    cultivo?: string;

    @ApiPropertyOptional({ example: 'Caldas' })
    @IsOptional()
    @IsString()
    region?: string;
}