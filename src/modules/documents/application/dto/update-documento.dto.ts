import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDocumentoDto } from './create-documento.dto';

export class UpdateDocumentoDto extends PartialType(CreateDocumentoDto) {
    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    esta_activo?: boolean;
}