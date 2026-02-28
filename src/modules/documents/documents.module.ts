import { Module } from '@nestjs/common';
import { DocumentsController } from './presentation/documents.controller';
import { DocumentsService } from './application/use-cases/documents.service';

/**
 * DocumentsModule - Gestion de documentos para sistema RAG
 */
@Module({
  imports: [],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
