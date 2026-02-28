import { Module } from '@nestjs/common';
import { FarmersController } from './presentation/farmers.controller';
import { FarmersService } from './application/use-cases/farmers.service';

/**
 * FarmersModule - Gestion de agricultores y perfiles
 */
@Module({
  imports: [],
  controllers: [FarmersController],
  providers: [FarmersService],
  exports: [FarmersService],
})
export class FarmersModule {}
