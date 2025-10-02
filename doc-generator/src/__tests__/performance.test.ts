/**
 * Tests de rendimiento para el sistema de embeddings
 * Nota: Estos tests usan mocks para evitar problemas con client-vector-search en Jest
 */

import { DocumentProcessor } from '../document-processor.js';
import { EmbeddingGenerator } from '../embedding-generator.js';
import { MetadataGenerator } from '../metadata-generator.js';
import * as path from 'path';

// Mock para evitar problemas con client-vector-search en Jest
jest.mock('client-vector-search', () => ({
  EmbeddingIndex: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue([])
  })),
  getEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.1))
}));

describe('Performance Tests', () => {
  const testDataPath = path.join(process.cwd(), 'test-data');

  describe('Document processing performance', () => {
    it('should process documents quickly', async () => {
      const startTime = Date.now();
      
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Debería procesar documentos en menos de 1 segundo
      expect(processingTime).toBeLessThan(1000);
      expect(documents.length).toBeGreaterThan(0);
      
      console.log(`Document processing time: ${processingTime}ms for ${documents.length} documents`);
    });

    it('should create chunks efficiently', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks.length, 0);
      
      expect(totalChunks).toBeGreaterThan(0);
      
      // Verificar que los chunks tienen contenido válido
      documents.forEach(doc => {
        doc.chunks.forEach(chunk => {
          expect(chunk.content.length).toBeGreaterThan(0);
          expect(chunk.title).toBeDefined();
          expect(chunk.url).toBeDefined();
        });
      });
      
      console.log(`Created ${totalChunks} chunks from ${documents.length} documents`);
    });
  });

  describe('Metadata generation performance', () => {
    it('should generate metadata quickly', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      // Crear datos de embedding mock
      const mockEmbeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      const metadataGenerator = new MetadataGenerator();
      
      const startTime = Date.now();
      
      const metadata = metadataGenerator.generateMetadata(documents, mockEmbeddingData);
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // La generación de metadatos debería ser muy rápida
      expect(generationTime).toBeLessThan(100);
      expect(metadata.version).toBeDefined();
      expect(metadata.totalChunks).toBe(mockEmbeddingData.chunks.length);
      
      console.log(`Metadata generation time: ${generationTime}ms`);
    });

    it('should validate metadata efficiently', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const mockEmbeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      const metadataGenerator = new MetadataGenerator();
      const metadata = metadataGenerator.generateMetadata(documents, mockEmbeddingData);
      
      const startTime = Date.now();
      
      const validation = metadataGenerator.validateMetadata(metadata, documents, mockEmbeddingData);
      
      const endTime = Date.now();
      const validationTime = endTime - startTime;
      
      // La validación debería ser muy rápida
      expect(validationTime).toBeLessThan(50);
      expect(validation.isValid).toBe(true);
      
      console.log(`Metadata validation time: ${validationTime}ms`);
    });
  });

  describe('Data integrity', () => {
    it('should maintain data consistency', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      // Verificar estructura de documentos
      documents.forEach(doc => {
        expect(doc.title).toBeDefined();
        expect(doc.content).toBeDefined();
        expect(doc.sourceFile).toBeDefined();
        expect(doc.chunks).toBeDefined();
        expect(Array.isArray(doc.chunks)).toBe(true);
      });
      
      // Verificar estructura de chunks
      const allChunks = documents.flatMap(doc => doc.chunks);
      allChunks.forEach(chunk => {
        expect(chunk.id).toBeDefined();
        expect(chunk.content).toBeDefined();
        expect(chunk.title).toBeDefined();
        expect(chunk.url).toBeDefined();
        expect(chunk.sourceFile).toBeDefined();
        expect(typeof chunk.chunkIndex).toBe('number');
      });
      
      console.log(`Data integrity verified for ${documents.length} documents and ${allChunks.length} chunks`);
    });

    it('should generate unique chunk IDs', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const allChunks = documents.flatMap(doc => doc.chunks);
      const chunkIds = allChunks.map(chunk => chunk.id);
      const uniqueIds = new Set(chunkIds);
      
      expect(chunkIds.length).toBe(uniqueIds.size);
      
      console.log(`All ${chunkIds.length} chunk IDs are unique`);
    });

    it('should generate valid URLs', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const allChunks = documents.flatMap(doc => doc.chunks);
      
      allChunks.forEach(chunk => {
        expect(chunk.url).toMatch(/^\/user-guide\//);
        expect(chunk.url).not.toContain('.njk');
        expect(chunk.url).not.toContain('index');
      });
      
      console.log(`All ${allChunks.length} chunk URLs are valid`);
    });
  });

  describe('Memory efficiency', () => {
    it('should handle multiple document processing runs', async () => {
      const processor = new DocumentProcessor(testDataPath);
      
      // Procesar documentos múltiples veces
      for (let i = 0; i < 5; i++) {
        const documents = await processor.processAllDocuments();
        expect(documents.length).toBeGreaterThan(0);
      }
      
      // Si llegamos aquí sin errores, no hay memory leaks obvios
      expect(true).toBe(true);
    });

    it('should process documents without excessive memory usage', async () => {
      const memBefore = process.memoryUsage();
      
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const memAfter = process.memoryUsage();
      const memIncrease = memAfter.heapUsed - memBefore.heapUsed;
      
      // El uso de memoria debería ser razonable (menos de 50MB)
      expect(memIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase: ${(memIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Error handling', () => {
    it('should handle missing files gracefully', async () => {
      const nonExistentPath = path.join(process.cwd(), 'non-existent-dir');
      
      const processor = new DocumentProcessor(nonExistentPath);
      
      await expect(processor.processAllDocuments()).rejects.toThrow();
    });

    it('should handle invalid embedding data gracefully', () => {
      const generator = new EmbeddingGenerator();
      
      const invalidData = {
        chunks: [{ id: 'test', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }],
        embeddings: [] // Missing embeddings
      };

      const validation = generator.validateEmbeddings(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });
});
