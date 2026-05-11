import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSesionWaDto } from './create-sesion-wa.dto';

export class UpdateSesionWaDto extends PartialType(CreateSesionWaDto) {
    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    esta_bloqueado?: boolean;

    @ApiPropertyOptional({ example: 'Spam detectado' })
    @IsOptional()
    @IsString()
    razon_bloqueo?: string;

    @ApiPropertyOptional({ description: 'Contexto de la conversación actual' })
    @IsOptional()
    @IsObject()
    contexto_sesion?: object;
}