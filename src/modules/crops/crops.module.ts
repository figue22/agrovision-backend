import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoCultivo } from '@modules/crops/domain/entities/tipo-cultivo.entity';
import { CropsController } from '@modules/crops/presentation/crops.controller';
import { CropsService } from '@modules/crops/application/use-cases/crops.service';

@Module({
  imports: [TypeOrmModule.forFeature([TipoCultivo])],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule {}
