/**
 * Tests unitarios para EmbeddingGenerator
 */

import { EmbeddingGenerator } from '../embedding-generator.js';
import { DocumentProcessor } from '../document-processor.js';
import * as path from 'path';
import { EmbeddingData, DocumentChunk } from '../types.js';

// Mock para evitar problemas con client-vector-search en Jest
jest.mock('client-vector-search', () => ({
  EmbeddingIndex: jest.fn().mockImplementation((objectsWithEmbeddings) => ({
    search: jest.fn().mockImplementation((queryEmbedding, options) => {
      // Si no hay objetos, devolver array vacío
      if (!objectsWithEmbeddings || objectsWithEmbeddings.length === 0) {
        return Promise.resolve([]);
      }
      
      // Devolver resultados mock basados en los objetos
      return Promise.resolve([
        { 
          id: 'mock-id-1', 
          score: 0.9, 
          title: 'Mock Title 1', 
          content: 'Mock Content 1', 
          url: '/mock-url-1',
          sourceFile: 'mock.njk',
          chunkIndex: 0
        },
        { 
          id: 'mock-id-2', 
          score: 0.8, 
          title: 'Mock Title 2', 
          content: 'Mock Content 2', 
          url: '/mock-url-2',
          sourceFile: 'mock.njk',
          chunkIndex: 1
        },
      ]);
    })
  })),
  getEmbedding: jest.fn().mockImplementation((text: string) => {
    // Solo fallar si el texto contiene 'error'
    if (text.includes('error')) {
      throw new Error('Mock embedding error');
    }
    return Promise.resolve(new Array(384).fill(0.1));
  })
}));

describe('EmbeddingGenerator', () => {
  let generator: EmbeddingGenerator;
  const testDataPath = path.join(process.cwd(), 'test-data');

  beforeEach(() => {
    generator = new EmbeddingGenerator(2, 1, 10); // batch size pequeño, menos retries, delay corto para tests
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should create EmbeddingGenerator instance', () => {
      expect(generator).toBeInstanceOf(EmbeddingGenerator);
    });

    it('should have configurable batch size', () => {
      const customGenerator = new EmbeddingGenerator(10, 5, 2000);
      expect(customGenerator).toBeInstanceOf(EmbeddingGenerator);
    });
  });

  describe('Embedding generation', () => {
    it('should generate embeddings for processed documents', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      const embeddingData = await generator.generateEmbeddings(documents);

      expect(embeddingData).toBeDefined();
      expect(embeddingData.chunks.length).toBe(documents.flatMap(doc => doc.chunks).length);
      expect(embeddingData.embeddings.length).toBe(documents.flatMap(doc => doc.chunks).length);
      expect(embeddingData.embeddings[0].length).toBe(384); // gte-small dimensions
    });

    it('should handle empty documents array', async () => {
      const embeddingData = await generator.generateEmbeddings([]);
      expect(embeddingData.chunks).toEqual([]);
      expect(embeddingData.embeddings).toEqual([]);
    });

    it('should process chunks in batches', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      const batchSize = 1; // Forcing small batch size for testing
      const batchGenerator = new EmbeddingGenerator(batchSize, 1, 10);

      const embeddingData = await batchGenerator.generateEmbeddings(documents);

      expect(embeddingData.chunks.length).toBeGreaterThan(0);
      expect(embeddingData.embeddings.length).toBe(embeddingData.chunks.length);
      // Verify that getEmbedding was called for each chunk
      const { getEmbedding } = await import('client-vector-search');
      expect(getEmbedding).toHaveBeenCalledTimes(embeddingData.chunks.length);
    });
  });

  describe('createEmbeddingIndex', () => {
    it('should create an EmbeddingIndex instance', async () => {
      const mockEmbeddingData: EmbeddingData = {
        chunks: [{ id: '1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }],
        embeddings: [new Array(384).fill(0.1)]
      };
      const index = await generator.createEmbeddingIndex(mockEmbeddingData);
      const { EmbeddingIndex } = await import('client-vector-search');
      expect(EmbeddingIndex).toHaveBeenCalledWith(
        mockEmbeddingData.chunks.map((chunk, index) => ({
          id: chunk.id,
          content: chunk.content,
          title: chunk.title,
          url: chunk.url,
          sourceFile: chunk.sourceFile,
          chunkIndex: chunk.chunkIndex,
          embedding: mockEmbeddingData.embeddings[index]
        }))
      );
      expect(index).toBeDefined();
    });

    it('should handle empty embedding data', async () => {
      const emptyEmbeddingData: EmbeddingData = { chunks: [], embeddings: [] };
      const index = await generator.createEmbeddingIndex(emptyEmbeddingData);
      const { EmbeddingIndex } = await import('client-vector-search');
      expect(EmbeddingIndex).toHaveBeenCalledWith([]);
      expect(index).toBeDefined();
    });
  });

  describe('validateEmbeddings', () => {
    it('should return isValid true for valid embeddings', () => {
      const validData: EmbeddingData = {
        chunks: [{ id: '1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }],
        embeddings: [new Array(384).fill(0.1)]
      };
      const validation = generator.validateEmbeddings(validData);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should return isValid false for inconsistent dimensions', () => {
      const invalidData: EmbeddingData = {
        chunks: [
          { id: '1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 },
          { id: '2', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }
        ],
        embeddings: [
          new Array(384).fill(0.1),
          new Array(100).fill(0.1) // Incorrect dimension
        ]
      };
      const validation = generator.validateEmbeddings(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('1 embeddings have incorrect dimensions');
    });

    it('should return isValid false for empty embeddings (all zeros)', () => {
      const emptyData: EmbeddingData = {
        chunks: [{ id: '1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }],
        embeddings: [new Array(384).fill(0)]
      };
      const validation = generator.validateEmbeddings(emptyData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('1 embeddings are empty (all zeros)');
    });

    it('should return isValid false for invalid embedding values (NaN, Infinity)', () => {
      const invalidValuesData: EmbeddingData = {
        chunks: [{ id: '1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }],
        embeddings: [new Array(384).fill(NaN)]
      };
      const validation = generator.validateEmbeddings(invalidValuesData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('1 embeddings contain invalid values');
    });

    it('should return isValid false if chunks and embeddings count mismatch', () => {
      const mismatchData: EmbeddingData = {
        chunks: [{ id: '1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }],
        embeddings: []
      };
      const validation = generator.validateEmbeddings(mismatchData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Mismatch: 1 chunks but 0 embeddings');
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', () => {
      const mockEmbeddingData: EmbeddingData = {
        chunks: [
          { id: 'test-1', content: 'test content 1', title: 'Test 1', url: '/test1', sourceFile: 'test1.njk', chunkIndex: 0 },
          { id: 'test-2', content: 'test content 2', title: 'Test 2', url: '/test2', sourceFile: 'test2.njk', chunkIndex: 0 }
        ],
        embeddings: [
          new Array(384).fill(0.1), // Valid embedding
          new Array(384).fill(0)    // Empty embedding
        ]
      };

      const stats = generator.getStats(mockEmbeddingData, 1000);

      expect(stats.totalChunks).toBe(2);
      expect(stats.successfulEmbeddings).toBe(1);
      expect(stats.failedEmbeddings).toBe(1);
      expect(stats.processingTime).toBe(1000);
      expect(stats.averageTimePerChunk).toBe(500);
    });
  });

  describe('Search functionality', () => {
    it('should perform test searches successfully', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();

      const generator = new EmbeddingGenerator(2, 1, 10);
      const embeddingData = await generator.generateEmbeddings(documents);

      const index = await generator.createEmbeddingIndex(embeddingData);
      expect(index).toBeDefined();

      // Probar búsqueda
      const results = await generator.testSearch(index, 'test query', 3);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0); // Expecting mock results
      expect(results[0].id).toBe('mock-id-1');
      expect(results[0].title).toBe('Mock Title 1');
      expect(results[0].content).toBe('Mock Content 1');
      expect(results[0].url).toBe('/mock-url-1');
    });

    it('should handle search with empty index', async () => {
      const generator = new EmbeddingGenerator();
      const emptyEmbeddingData = { chunks: [], embeddings: [] };

      const index = await generator.createEmbeddingIndex(emptyEmbeddingData);
      expect(index).toBeDefined();

      const results = await generator.testSearch(index, 'test query', 3);
      expect(results).toEqual([]);
    });

    it('should handle search with invalid query', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();

      const generator = new EmbeddingGenerator(2, 1, 10);
      const embeddingData = await generator.generateEmbeddings(documents);

      const index = await generator.createEmbeddingIndex(embeddingData);

      // Probar con query vacío
      const results = await generator.testSearch(index, '', 3);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0); // Still expecting mock results
    });
  });

  describe('Error handling', () => {
    it('should handle embedding generation failures gracefully', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();

      // Mock para simular fallos en la generación de embeddings
      const { getEmbedding } = await import('client-vector-search');
      (getEmbedding as jest.Mock).mockImplementation((text: string) => {
        // Fallar para todos los chunks
        throw new Error('Mock embedding error');
      });

      const embeddingData = await generator.generateEmbeddings(documents);

      // Debería crear embeddings vacíos como fallback
      expect(embeddingData.embeddings.length).toBe(documents.flatMap(doc => doc.chunks).length);
      expect(embeddingData.embeddings.every(emb => emb.every(val => val === 0))).toBe(true);
    });

    it('should handle invalid embedding data gracefully', () => {
      const invalidData = {
        chunks: [{ id: 'test', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }],
        embeddings: [] // Missing embeddings
      };

      const validation = generator.validateEmbeddings(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Mismatch: 1 chunks but 0 embeddings');
    });

    it('should handle corrupted embeddings', () => {
      const corruptedData = {
        chunks: [
          { id: 'test-1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 },
          { id: 'test-2', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }
        ],
        embeddings: [
          new Array(384).fill(0.1), // Valid
          new Array(100).fill(0.1)   // Wrong dimensions
        ]
      };

      const validation = generator.validateEmbeddings(corruptedData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('1 embeddings have incorrect dimensions');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle very large batch sizes', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();

      const generator = new EmbeddingGenerator(100, 1, 10); // Batch size muy grande
      const embeddingData = await generator.generateEmbeddings(documents);

      expect(embeddingData.embeddings.length).toBeGreaterThan(0);
    });

    it('should handle single chunk documents', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();

      // Filtrar documentos con un solo chunk
      const singleChunkDocs = documents.filter(doc => doc.chunks.length === 1);

      if (singleChunkDocs.length > 0) {
        const generator = new EmbeddingGenerator(1, 1, 10);
        const embeddingData = await generator.generateEmbeddings(singleChunkDocs);

        expect(embeddingData.embeddings.length).toBe(singleChunkDocs.length);
      }
    });

    it('should maintain embedding quality across different batch sizes', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();

      // Resetear el mock para que funcione correctamente
      const { getEmbedding } = await import('client-vector-search');
      (getEmbedding as jest.Mock).mockImplementation((text: string) => {
        // Solo fallar si el texto contiene 'error'
        if (text.includes('error')) {
          throw new Error('Mock embedding error');
        }
        return Promise.resolve(new Array(384).fill(0.1));
      });

      const generator1 = new EmbeddingGenerator(1, 1, 10);
      const generator2 = new EmbeddingGenerator(5, 1, 10);

      const embeddingData1 = await generator1.generateEmbeddings(documents);
      const embeddingData2 = await generator2.generateEmbeddings(documents);

      // Ambos deberían generar el mismo número de embeddings
      expect(embeddingData1.embeddings.length).toBe(embeddingData2.embeddings.length);

      // Ambos deberían pasar validación
      const validation1 = generator1.validateEmbeddings(embeddingData1);
      const validation2 = generator2.validateEmbeddings(embeddingData2);

      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
    }, 15000); // Aumentar timeout para este test
  });
});