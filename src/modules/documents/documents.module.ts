import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Documento } from './domain/entities/documento.entity';
import { IndiceRagDocumento } from './domain/entities/indice-rag-documento.entity';
import { DocumentsController } from './presentation/documents.controller';
import { DocumentsService } from './application/use-cases/documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Documento, IndiceRagDocumento])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule { }