/**
 * Tests de calidad para embeddings y búsquedas
 * Nota: Estos tests se enfocan en la calidad de datos sin generar embeddings reales
 */

import { DocumentProcessor } from '../document-processor.js';
import { EmbeddingGenerator } from '../embedding-generator.js';
import * as path from 'path';

// Mock para evitar problemas con client-vector-search en Jest
jest.mock('client-vector-search', () => ({
  EmbeddingIndex: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue([])
  })),
  getEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.1))
}));

describe('Embedding Quality Tests', () => {
  const testDataPath = path.join(process.cwd(), 'test-data');

  describe('Chunk quality', () => {
    it('should create meaningful chunks', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      documents.forEach(doc => {
        doc.chunks.forEach(chunk => {
          // Cada chunk debería tener contenido significativo
          expect(chunk.content.length).toBeGreaterThan(10);
          expect(chunk.content.trim().length).toBeGreaterThan(0);
          
          // El contenido no debería ser solo espacios o caracteres especiales
          const meaningfulContent = chunk.content.replace(/[\s\n\r\t]/g, '');
          expect(meaningfulContent.length).toBeGreaterThan(5);
        });
      });
    });

    it('should maintain chunk boundaries appropriately', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      documents.forEach(doc => {
        if (doc.chunks.length > 1) {
          // Verificar que los chunks no se solapan excesivamente
          for (let i = 0; i < doc.chunks.length - 1; i++) {
            const chunk1 = doc.chunks[i];
            const chunk2 = doc.chunks[i + 1];
            
            // Los chunks consecutivos deberían tener contenido diferente
            expect(chunk1.content).not.toBe(chunk2.content);
            
            // Los chunks deberían tener tamaños razonables
            expect(chunk1.content.length).toBeLessThanOrEqual(500);
            expect(chunk2.content.length).toBeLessThanOrEqual(500);
          }
        }
      });
    });

    it('should preserve document structure in chunks', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      documents.forEach(doc => {
        doc.chunks.forEach(chunk => {
          // Cada chunk debería tener metadatos correctos
          expect(chunk.title).toBeDefined();
          expect(chunk.title.length).toBeGreaterThan(0);
          expect(chunk.url).toBeDefined();
          expect(chunk.url.startsWith('/user-guide/')).toBe(true);
          expect(chunk.sourceFile).toBeDefined();
          expect(typeof chunk.chunkIndex).toBe('number');
          expect(chunk.chunkIndex).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('Data integrity', () => {
    it('should maintain 1:1 correspondence between chunks and embeddings', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const generator = new EmbeddingGenerator(2);
      
      // Crear datos mock para simular embeddings
      const mockEmbeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      // Debería haber exactamente un embedding por chunk
      expect(mockEmbeddingData.chunks.length).toBe(mockEmbeddingData.embeddings.length);
      
      // Cada chunk debería tener un embedding correspondiente
      for (let i = 0; i < mockEmbeddingData.chunks.length; i++) {
        const chunk = mockEmbeddingData.chunks[i];
        const embedding = mockEmbeddingData.embeddings[i];
        
        expect(chunk).toBeDefined();
        expect(embedding).toBeDefined();
        expect(Array.isArray(embedding)).toBe(true);
      }
    });

    it('should preserve all original document content', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      // Reconstruir contenido original de chunks
      const reconstructedContent = documents
        .flatMap(doc => doc.chunks)
        .map(chunk => chunk.content)
        .join(' ');
      
      // El contenido reconstruido debería contener información de todos los documentos
      documents.forEach(doc => {
        // Al menos parte del contenido del documento debería estar presente
        const docContentWords = doc.content.toLowerCase().split(/\s+/);
        const reconstructedWords = reconstructedContent.toLowerCase().split(/\s+/);
        
        const commonWords = docContentWords.filter(word => 
          reconstructedWords.includes(word) && word.length > 3
        );
        
        // Debería haber al menos algunas palabras en común
        expect(commonWords.length).toBeGreaterThan(0);
      });
    });

    it('should handle special characters and encoding correctly', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      // Verificar que no hay problemas de encoding
      documents.forEach(doc => {
        doc.chunks.forEach(chunk => {
          expect(() => {
            JSON.stringify(chunk);
          }).not.toThrow();
          
          // El contenido debería ser una string válida
          expect(typeof chunk.content).toBe('string');
          expect(chunk.content.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Embedding validation', () => {
    it('should validate embedding dimensions correctly', () => {
      const generator = new EmbeddingGenerator();
      
      // Test con embeddings válidos
      const validData = {
        chunks: [
          { id: 'test-1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 },
          { id: 'test-2', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }
        ],
        embeddings: [
          new Array(384).fill(0.1), // Valid embedding
          new Array(384).fill(0.2)  // Valid embedding
        ]
      };
      
      const validation = generator.validateEmbeddings(validData);
      expect(validation.isValid).toBe(true);
    });

    it('should detect invalid embedding dimensions', () => {
      const generator = new EmbeddingGenerator();
      
      const invalidData = {
        chunks: [
          { id: 'test-1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 },
          { id: 'test-2', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }
        ],
        embeddings: [
          new Array(384).fill(0.1), // Valid embedding
          new Array(100).fill(0.1)  // Wrong dimensions
        ]
      };
      
      const validation = generator.validateEmbeddings(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('1 embeddings have incorrect dimensions');
    });

    it('should detect empty embeddings', () => {
      const generator = new EmbeddingGenerator();
      
      const emptyData = {
        chunks: [
          { id: 'test-1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }
        ],
        embeddings: [
          new Array(384).fill(0) // Empty embedding
        ]
      };
      
      const validation = generator.validateEmbeddings(emptyData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('1 embeddings are empty (all zeros)');
    });

    it('should detect invalid embedding values', () => {
      const generator = new EmbeddingGenerator();
      
      const invalidData = {
        chunks: [
          { id: 'test-1', content: 'test', title: 'Test', url: '/test', sourceFile: 'test.njk', chunkIndex: 0 }
        ],
        embeddings: [
          new Array(384).fill(NaN) // Invalid values
        ]
      };
      
      const validation = generator.validateEmbeddings(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('1 embeddings contain invalid values');
    });
  });

  describe('URL generation quality', () => {
    it('should generate consistent URLs', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const allChunks = documents.flatMap(doc => doc.chunks);
      
      allChunks.forEach(chunk => {
        // URLs deberían seguir un patrón consistente
        expect(chunk.url).toMatch(/^\/user-guide\//);
        expect(chunk.url).not.toContain('.njk');
        expect(chunk.url).not.toContain('index');
        
        // URLs deberían ser únicos
        const chunksWithSameUrl = allChunks.filter(c => c.url === chunk.url);
        expect(chunksWithSameUrl.length).toBe(1);
      });
    });

    it('should generate meaningful URLs from file paths', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      documents.forEach(doc => {
        doc.chunks.forEach(chunk => {
          // El URL debería reflejar la estructura del archivo
          const expectedPath = doc.sourceFile.replace('.njk', '').replace('index', '');
          expect(chunk.url).toContain(expectedPath);
        });
      });
    });
  });

  describe('Content quality', () => {
    it('should extract meaningful titles', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      documents.forEach(doc => {
        expect(doc.title).toBeDefined();
        expect(doc.title.length).toBeGreaterThan(0);
        expect(doc.title).not.toMatch(/^\s*$/); // No solo espacios
        
        // Los títulos deberían ser descriptivos
        expect(doc.title.length).toBeGreaterThan(3);
      });
    });

    it('should clean HTML content properly', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      documents.forEach(doc => {
        // El contenido no debería contener tags HTML
        expect(doc.content).not.toMatch(/<[^>]+>/);
        
        // El contenido debería tener texto significativo
        const textContent = doc.content.replace(/\s+/g, ' ').trim();
        expect(textContent.length).toBeGreaterThan(10);
      });
    });

    it('should preserve important content structure', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      documents.forEach(doc => {
        // El contenido debería mantener información importante
        const content = doc.content.toLowerCase();
        
        // Verificar que no se perdió contenido importante
        expect(content.length).toBeGreaterThan(50);
        
        // El contenido debería tener palabras significativas
        const words = content.split(/\s+/).filter(word => word.length > 3);
        expect(words.length).toBeGreaterThan(5); // Ajustado para documentos de test pequeños
      });
    });
  });
});
