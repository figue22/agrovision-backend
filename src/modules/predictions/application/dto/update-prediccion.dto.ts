import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePrediccionDto } from './create-prediccion.dto';

export class UpdatePrediccionDto extends PartialType(
    OmitType(CreatePrediccionDto, ['parcela_id', 'tipo_cultivo_id'] as const),
) { }