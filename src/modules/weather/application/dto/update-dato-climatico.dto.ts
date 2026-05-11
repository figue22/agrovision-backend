import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDatoClimaticoDto } from './create-dato-climatico.dto';

export class UpdateDatoClimaticoDto extends PartialType(
    OmitType(CreateDatoClimaticoDto, ['parcela_id'] as const),
) { }