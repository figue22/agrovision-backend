import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { DocumentsService } from './documents.service';
import { Documento } from '@modules/documents/domain/entities/documento.entity';
import { IndiceRagDocumento } from '@modules/documents/domain/entities/indice-rag-documento.entity';

const mockDoc = {
  documento_id: 'uuid-doc-1',
  titulo: 'Guía de plagas',
  categoria: 'guia_tecnica',
  ruta_archivo: '/docs/guia.pdf',
  tipo_archivo: 'pdf',
  esta_activo: true,
  estado_indexacion: 'pendiente',
  creado_en: new Date(),
};

const mockDocRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((item) => ({ ...mockDoc, ...item })),
  remove: jest.fn(),
  count: jest.fn().mockResolvedValue(10),
};

const mockIndiceRepo = { findOne: jest.fn() };

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Documento), useValue: mockDocRepo },
        { provide: getRepositoryToken(IndiceRagDocumento), useValue: mockIndiceRepo },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => { expect(service).toBeDefined(); });

  describe('create', () => {
    it('debe crear un documento', async () => {
      await service.create('uuid-user-1', {
        titulo: 'Test', categoria: 'guia', ruta_archivo: '/test.pdf', tipo_archivo: 'pdf',
      } as any);
      expect(mockDocRepo.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar documento', async () => {
      mockDocRepo.findOne.mockResolvedValue(mockDoc);
      const result = await service.findOne('uuid-doc-1');
      expect(result.titulo).toBe('Guía de plagas');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockDocRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('uuid-no')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debe eliminar documento', async () => {
      mockDocRepo.findOne.mockResolvedValue(mockDoc);
      await expect(service.remove('uuid-doc-1')).resolves.toBeUndefined();
    });
  });

  describe('getResumen', () => {
    it('debe retornar conteos', async () => {
      const result = await service.getResumen();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('activos');
      expect(result).toHaveProperty('pendientes_indexacion');
      expect(result).toHaveProperty('indexados');
      expect(result).toHaveProperty('fallidos');
    });
  });
});