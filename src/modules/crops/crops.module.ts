import { Module } from '@nestjs/common';
import { CropsController } from './presentation/crops.controller';
import { CropsService } from './application/use-cases/crops.service';

/**
 * CropsModule - Tipos de cultivo y cultivos por parcela (cultivos_parcela)
 */
@Module({
  imports: [],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule {}
