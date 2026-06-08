import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
    @ApiProperty({ example: '¿Cómo fertilizar el café?' })
    @IsString()
    mensaje: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    conversacion_id?: string;

    @ApiPropertyOptional({ example: 'cafe' })
    @IsOptional()
    @IsString()
    cultivo?: string;

    @ApiPropertyOptional({ example: 'Caldas' })
    @IsOptional()
    @IsString()
    region?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    parcela_id?: string;
}