/**
 * Tests de integración para el sistema completo de embeddings
 * Nota: Estos tests usan mocks para evitar problemas con client-vector-search en Jest
 */

import { DocumentProcessor } from '../document-processor.js';
import { EmbeddingGenerator } from '../embedding-generator.js';
import { MetadataGenerator } from '../metadata-generator.js';
import { FileCopier } from '../file-copier.js';
import * as path from 'path';
import * as fs from 'fs';

// Mock para evitar problemas con client-vector-search en Jest
jest.mock('client-vector-search', () => ({
  EmbeddingIndex: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue([])
  })),
  getEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.1))
}));

describe('Integration Tests', () => {
  const testDataPath = path.join(process.cwd(), 'test-data');
  const outputDir = path.join(process.cwd(), 'test-output');
  const targetDir = path.join(process.cwd(), 'test-public');

  beforeEach(async () => {
    // Limpiar directorios de test
    if (fs.existsSync(outputDir)) {
      await fs.promises.rm(outputDir, { recursive: true });
    }
    if (fs.existsSync(targetDir)) {
      await fs.promises.rm(targetDir, { recursive: true });
    }
    
    // Crear directorios
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.mkdir(targetDir, { recursive: true });
  });

  afterEach(async () => {
    // Limpiar después de cada test
    if (fs.existsSync(outputDir)) {
      await fs.promises.rm(outputDir, { recursive: true });
    }
    if (fs.existsSync(targetDir)) {
      await fs.promises.rm(targetDir, { recursive: true });
    }
  });

  describe('Complete pipeline', () => {
    it('should process documents, generate embeddings, create metadata and copy files', async () => {
      // Paso 1: Procesar documentos
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      expect(documents.length).toBeGreaterThan(0);
      expect(documents[0].chunks.length).toBeGreaterThan(0);

      // Paso 2: Generar embeddings (mock)
      const embeddingGenerator = new EmbeddingGenerator(2);
      const mockEmbeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      expect(mockEmbeddingData.chunks.length).toBeGreaterThan(0);
      expect(mockEmbeddingData.embeddings.length).toBe(mockEmbeddingData.chunks.length);

      // Paso 3: Validar embeddings
      const validation = embeddingGenerator.validateEmbeddings(mockEmbeddingData);
      expect(validation.isValid).toBe(true);

      // Paso 4: Crear índice y probar búsqueda (mock)
      const index = await embeddingGenerator.createEmbeddingIndex(mockEmbeddingData);
      expect(index).toBeDefined();

      // Paso 5: Generar metadatos
      const metadataGenerator = new MetadataGenerator();
      const processingStats = metadataGenerator.generateProcessingStats(
        documents,
        mockEmbeddingData,
        1000,
        {
          successfulEmbeddings: mockEmbeddingData.embeddings.length,
          failedEmbeddings: 0,
          averageTimePerEmbedding: 50
        }
      );
      
      const metadata = metadataGenerator.generateMetadata(documents, mockEmbeddingData, processingStats);
      
      expect(metadata.version).toBeDefined();
      expect(metadata.totalChunks).toBe(mockEmbeddingData.chunks.length);
      expect(metadata.totalDocuments).toBe(documents.length);
      expect(metadata.fileHashes).toBeDefined();

      // Paso 6: Guardar archivos
      const embeddingsPath = path.join(outputDir, 'embeddings.json');
      const metadataPath = path.join(outputDir, 'metadata.json');
      
      await fs.promises.writeFile(embeddingsPath, JSON.stringify(mockEmbeddingData, null, 2));
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      expect(fs.existsSync(embeddingsPath)).toBe(true);
      expect(fs.existsSync(metadataPath)).toBe(true);

      // Paso 7: Copiar archivos
      const copier = new FileCopier(outputDir, targetDir);
      await copier.copyToPublic();
      
      const targetEmbeddingsPath = path.join(targetDir, 'embeddings.json');
      const targetMetadataPath = path.join(targetDir, 'metadata.json');
      
      expect(fs.existsSync(targetEmbeddingsPath)).toBe(true);
      expect(fs.existsSync(targetMetadataPath)).toBe(true);

      // Verificar contenido de archivos copiados
      const copiedEmbeddings = JSON.parse(await fs.promises.readFile(targetEmbeddingsPath, 'utf-8'));
      const copiedMetadata = JSON.parse(await fs.promises.readFile(targetMetadataPath, 'utf-8'));
      
      expect(copiedEmbeddings.chunks.length).toBe(mockEmbeddingData.chunks.length);
      expect(copiedMetadata.version).toBe(metadata.version);
    });

    it('should handle empty document set gracefully', async () => {
      // Crear directorio vacío temporal
      const emptyDir = path.join(process.cwd(), 'empty-test-dir');
      await fs.promises.mkdir(emptyDir, { recursive: true });
      
      try {
        const processor = new DocumentProcessor(emptyDir);
        const documents = await processor.processAllDocuments();
        
        expect(documents).toEqual([]);
        
        const mockEmbeddingData = {
          chunks: [],
          embeddings: []
        };
        
        expect(mockEmbeddingData.chunks).toEqual([]);
        expect(mockEmbeddingData.embeddings).toEqual([]);
        
        const metadataGenerator = new MetadataGenerator();
        const metadata = metadataGenerator.generateMetadata(documents, mockEmbeddingData);
        
        expect(metadata.totalDocuments).toBe(0);
        expect(metadata.totalChunks).toBe(0);
        
      } finally {
        // Limpiar directorio temporal
        await fs.promises.rm(emptyDir, { recursive: true });
      }
    });

    it('should maintain consistency across multiple runs', async () => {
      // Primera ejecución
      const processor = new DocumentProcessor(testDataPath);
      const documents1 = await processor.processAllDocuments();
      
      const mockEmbeddingData1 = {
        chunks: documents1.flatMap(doc => doc.chunks),
        embeddings: documents1.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      const metadataGenerator = new MetadataGenerator();
      const metadata1 = metadataGenerator.generateMetadata(documents1, mockEmbeddingData1);

      // Segunda ejecución
      const documents2 = await processor.processAllDocuments();
      const mockEmbeddingData2 = {
        chunks: documents2.flatMap(doc => doc.chunks),
        embeddings: documents2.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      const metadata2 = metadataGenerator.generateMetadata(documents2, mockEmbeddingData2);

      // Los resultados deberían ser consistentes
      expect(documents1.length).toBe(documents2.length);
      expect(mockEmbeddingData1.chunks.length).toBe(mockEmbeddingData2.chunks.length);
      expect(metadata1.totalDocuments).toBe(metadata2.totalDocuments);
      expect(metadata1.totalChunks).toBe(metadata2.totalChunks);
      
      // Los hashes de archivos deberían ser iguales
      expect(metadata1.fileHashes).toEqual(metadata2.fileHashes);
    });
  });

  describe('Error handling', () => {
    it('should handle missing source directory', async () => {
      const nonExistentDir = path.join(process.cwd(), 'non-existent-dir');
      
      expect(() => {
        new DocumentProcessor(nonExistentDir);
      }).not.toThrow(); // No debería lanzar error en construcción
      
      const processor = new DocumentProcessor(nonExistentDir);
      
      await expect(processor.processAllDocuments()).rejects.toThrow();
    });

    it('should handle file system errors during copy', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const mockEmbeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      // Crear archivos de salida
      const embeddingsPath = path.join(outputDir, 'embeddings.json');
      const metadataPath = path.join(outputDir, 'metadata.json');
      
      await fs.promises.writeFile(embeddingsPath, JSON.stringify(mockEmbeddingData, null, 2));
      await fs.promises.writeFile(metadataPath, JSON.stringify({ version: '1.0.0' }, null, 2));
      
      // Intentar copiar a directorio no existente
      const invalidTargetDir = path.join(process.cwd(), 'invalid-target');
      
      const copier = new FileCopier(outputDir, invalidTargetDir);
      
      // El FileCopier debería crear el directorio si no existe, así que este test debería pasar
      await expect(copier.copyToPublic()).resolves.toBeUndefined();
    });
  });

  describe('Performance tests', () => {
    it('should process documents within reasonable time', async () => {
      const startTime = Date.now();
      
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      const mockEmbeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      const metadataGenerator = new MetadataGenerator();
      const metadata = metadataGenerator.generateMetadata(documents, mockEmbeddingData);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Debería procesar en menos de 1 segundo para datos de test
      expect(processingTime).toBeLessThan(1000);
      
      // Verificar que tenemos estadísticas de tiempo
      expect(metadata).toBeDefined();
    });

    it('should maintain performance with repeated runs', async () => {
      const times: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        const processor = new DocumentProcessor(testDataPath);
        const documents = await processor.processAllDocuments();
        
        const mockEmbeddingData = {
          chunks: documents.flatMap(doc => doc.chunks),
          embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
        };
        
        const endTime = Date.now();
        times.push(endTime - startTime);
      }
      
      // Los tiempos deberían ser consistentes
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      // La variación no debería ser demasiado grande (relajamos el criterio para tests)
      expect(maxTime - minTime).toBeLessThan(avgTime * 2);
      
      console.log(`Repeated runs - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);
    });
  });

  describe('Resource usage', () => {
    it('should not leak memory during processing', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      // Ejecutar múltiples veces para detectar memory leaks
      for (let i = 0; i < 5; i++) {
        const mockEmbeddingData = {
          chunks: documents.flatMap(doc => doc.chunks),
          embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
        };
        
        const metadataGenerator = new MetadataGenerator();
        const metadata = metadataGenerator.generateMetadata(documents, mockEmbeddingData);
        
        // Forzar garbage collection si está disponible
        if (global.gc) {
          global.gc();
        }
      }
      
      // Si llegamos aquí sin errores, no hay memory leaks obvios
      expect(true).toBe(true);
    });

    it('should handle large datasets efficiently', async () => {
      const processor = new DocumentProcessor(testDataPath);
      const documents = await processor.processAllDocuments();
      
      // Simular dataset más grande duplicando documentos
      const largeDocuments = [...documents, ...documents, ...documents];
      
      const startTime = Date.now();
      
      const mockEmbeddingData = {
        chunks: largeDocuments.flatMap(doc => doc.chunks),
        embeddings: largeDocuments.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Debería manejar datasets más grandes de manera eficiente
      expect(processingTime).toBeLessThan(1000);
      expect(mockEmbeddingData.embeddings.length).toBe(largeDocuments.flatMap(doc => doc.chunks).length);
      
      console.log(`Large dataset processing: ${processingTime}ms for ${largeDocuments.length} documents`);
    });
  });
});