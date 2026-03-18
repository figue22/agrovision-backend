import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { FarmersController } from '@modules/farmers/presentation/farmers.controller';
import { FarmersService } from '@modules/farmers/application/use-cases/farmers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agricultor])],
  controllers: [FarmersController],
  providers: [FarmersService],
  exports: [FarmersService],
})
export class FarmersModule {}
