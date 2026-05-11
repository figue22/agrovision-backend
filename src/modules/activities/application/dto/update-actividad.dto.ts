import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateActividadDto } from './create-actividad.dto';

export class UpdateActividadDto extends PartialType(
    OmitType(CreateActividadDto, ['parcela_id'] as const),
) { }