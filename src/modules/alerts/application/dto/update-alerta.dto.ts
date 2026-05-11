import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAlertaDto } from './create-alerta.dto';

export class UpdateAlertaDto extends PartialType(
    OmitType(CreateAlertaDto, ['usuario_id'] as const),
) { }