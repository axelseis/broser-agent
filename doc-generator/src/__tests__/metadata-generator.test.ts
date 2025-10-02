/**
 * Tests unitarios para MetadataGenerator
 */

import { MetadataGenerator } from '../metadata-generator.js';
import { DocumentProcessor } from '../document-processor.js';
import * as path from 'path';

describe('MetadataGenerator', () => {
  let generator: MetadataGenerator;
  const testDataPath = path.join(process.cwd(), 'test-data');

  beforeEach(() => {
    generator = new MetadataGenerator();
  });

  describe('Basic functionality', () => {
    it('should create MetadataGenerator instance', () => {
      expect(generator).toBeInstanceOf(MetadataGenerator);
    });

    it('should create MetadataGenerator with custom options', () => {
      const customGenerator = new MetadataGenerator({
        includeFileHashes: false,
        includeContentHash: false,
        customVersionPrefix: '2.0.0'
      });
      expect(customGenerator).toBeInstanceOf(MetadataGenerator);
    });
  });

  describe('Metadata generation', () => {
    let documents: any[];
    let embeddingData: any;

    beforeEach(async () => {
      const processor = new DocumentProcessor(testDataPath);
      documents = await processor.processAllDocuments();
      
      embeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
    });

    it('should generate complete metadata', () => {
      const metadata = generator.generateMetadata(documents, embeddingData);
      
      expect(metadata).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.lastGenerated).toBeDefined();
      expect(metadata.totalChunks).toBe(embeddingData.chunks.length);
      expect(metadata.totalDocuments).toBe(documents.length);
      expect(metadata.fileHashes).toBeDefined();
    });

    it('should include file hashes by default', () => {
      const metadata = generator.generateMetadata(documents, embeddingData);
      
      expect(metadata.fileHashes).toBeDefined();
      expect(Object.keys(metadata.fileHashes).length).toBe(documents.length);
      
      // Verificar que cada archivo tiene un hash
      documents.forEach(doc => {
        expect(metadata.fileHashes[doc.sourceFile]).toBeDefined();
        expect(typeof metadata.fileHashes[doc.sourceFile]).toBe('string');
        expect(metadata.fileHashes[doc.sourceFile].length).toBe(64); // SHA-256 hex length
      });
    });

    it('should generate version with content hash', () => {
      const metadata = generator.generateMetadata(documents, embeddingData);
      
      expect(metadata.version).toMatch(/^1\.0\.0-[a-f0-9]{8}$/);
    });

    it('should include processing stats when provided', () => {
      const processingStats = {
        totalProcessingTime: 1000,
        averageTimePerDocument: 100,
        averageTimePerChunk: 50,
        embeddingStats: {
          successfulEmbeddings: 10,
          failedEmbeddings: 0,
          averageTimePerEmbedding: 25
        }
      };

      const metadata = generator.generateMetadata(documents, embeddingData, processingStats);
      
      expect((metadata as any).processingStats).toBeDefined();
      expect((metadata as any).processingStats.totalProcessingTime).toBe(1000);
    });
  });

  describe('Custom options', () => {
    let documents: any[];
    let embeddingData: any;

    beforeEach(async () => {
      const processor = new DocumentProcessor(testDataPath);
      documents = await processor.processAllDocuments();
      
      embeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
    });

    it('should exclude file hashes when disabled', () => {
      const customGenerator = new MetadataGenerator({
        includeFileHashes: false
      });

      const metadata = customGenerator.generateMetadata(documents, embeddingData);
      
      expect(metadata.fileHashes).toEqual({});
    });

    it('should use custom version prefix', () => {
      const customGenerator = new MetadataGenerator({
        customVersionPrefix: '2.1.0'
      });

      const metadata = customGenerator.generateMetadata(documents, embeddingData);
      
      expect(metadata.version).toMatch(/^2\.1\.0-[a-f0-9]{8}$/);
    });

    it('should exclude processing stats when disabled', () => {
      const customGenerator = new MetadataGenerator({
        includeProcessingStats: false
      });

      const processingStats = {
        totalProcessingTime: 1000,
        averageTimePerDocument: 100,
        averageTimePerChunk: 50
      };

      const metadata = customGenerator.generateMetadata(documents, embeddingData, processingStats);
      
      expect((metadata as any).processingStats).toBeUndefined();
    });
  });

  describe('Validation', () => {
    let documents: any[];
    let embeddingData: any;

    beforeEach(async () => {
      const processor = new DocumentProcessor(testDataPath);
      documents = await processor.processAllDocuments();
      
      embeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
    });

    it('should validate correct metadata', () => {
      const metadata = generator.generateMetadata(documents, embeddingData);
      const validation = generator.validateMetadata(metadata, documents, embeddingData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect chunk count mismatch', () => {
      const metadata = generator.generateMetadata(documents, embeddingData);
      metadata.totalChunks = 999; // Wrong count
      
      const validation = generator.validateMetadata(metadata, documents, embeddingData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(`Chunk count mismatch: metadata says 999, actual is ${embeddingData.chunks.length}`);
    });

    it('should detect document count mismatch', () => {
      const metadata = generator.generateMetadata(documents, embeddingData);
      metadata.totalDocuments = 999; // Wrong count
      
      const validation = generator.validateMetadata(metadata, documents, embeddingData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(`Document count mismatch: metadata says 999, actual is ${documents.length}`);
    });

    it('should detect hash mismatches', () => {
      const metadata = generator.generateMetadata(documents, embeddingData);
      const firstFile = Object.keys(metadata.fileHashes)[0];
      metadata.fileHashes[firstFile] = 'invalid-hash';
      
      const validation = generator.validateMetadata(metadata, documents, embeddingData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(`Hash mismatch for file ${firstFile}`);
    });
  });

  describe('Comparison', () => {
    let documents: any[];
    let embeddingData: any;

    beforeEach(async () => {
      const processor = new DocumentProcessor(testDataPath);
      documents = await processor.processAllDocuments();
      
      embeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
    });

    it('should detect no changes in identical metadata', () => {
      const metadata1 = generator.generateMetadata(documents, embeddingData);
      const metadata2 = generator.generateMetadata(documents, embeddingData);
      
      const comparison = generator.compareMetadata(metadata1, metadata2);
      
      expect(comparison.hasChanges).toBe(false);
      expect(comparison.isCompatible).toBe(true);
    });

    it('should detect version changes', () => {
      const metadata1 = generator.generateMetadata(documents, embeddingData);
      const metadata2 = generator.generateMetadata(documents, embeddingData);
      metadata2.version = '2.0.0-abc12345';
      
      const comparison = generator.compareMetadata(metadata1, metadata2);
      
      expect(comparison.hasChanges).toBe(true);
      expect(comparison.changes).toContain(`Version changed: ${metadata1.version} → ${metadata2.version}`);
    });

    it('should detect document count changes as incompatible', () => {
      const metadata1 = generator.generateMetadata(documents, embeddingData);
      const metadata2 = generator.generateMetadata(documents, embeddingData);
      metadata2.totalDocuments = metadata1.totalDocuments + 1;
      
      const comparison = generator.compareMetadata(metadata1, metadata2);
      
      expect(comparison.hasChanges).toBe(true);
      expect(comparison.isCompatible).toBe(false);
      expect(comparison.changes).toContain(`Document count changed: ${metadata1.totalDocuments} → ${metadata2.totalDocuments}`);
    });
  });

  describe('Processing stats', () => {
    let documents: any[];
    let embeddingData: any;

    beforeEach(async () => {
      const processor = new DocumentProcessor(testDataPath);
      documents = await processor.processAllDocuments();
      
      embeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
    });

    it('should generate processing stats', () => {
      const stats = generator.generateProcessingStats(
        documents,
        embeddingData,
        1000,
        {
          successfulEmbeddings: 10,
          failedEmbeddings: 0,
          averageTimePerEmbedding: 50
        }
      );
      
      expect(stats.totalProcessingTime).toBe(1000);
      expect(stats.averageTimePerDocument).toBe(1000 / documents.length);
      expect(stats.averageTimePerChunk).toBe(1000 / embeddingData.chunks.length);
      expect(stats.embeddingStats).toBeDefined();
      expect(stats.embeddingStats.successfulEmbeddings).toBe(10);
    });
  });

  describe('Serialization', () => {
    let documents: any[];
    let embeddingData: any;

    beforeEach(async () => {
      const processor = new DocumentProcessor(testDataPath);
      documents = await processor.processAllDocuments();
      
      embeddingData = {
        chunks: documents.flatMap(doc => doc.chunks),
        embeddings: documents.flatMap(doc => doc.chunks).map(() => new Array(384).fill(0.1))
      };
    });

    it('should serialize and deserialize metadata', () => {
      const originalMetadata = generator.generateMetadata(documents, embeddingData);
      const jsonString = generator.serializeMetadata(originalMetadata);
      const deserializedMetadata = generator.deserializeMetadata(jsonString);
      
      expect(deserializedMetadata.version).toBe(originalMetadata.version);
      expect(deserializedMetadata.totalChunks).toBe(originalMetadata.totalChunks);
      expect(deserializedMetadata.totalDocuments).toBe(originalMetadata.totalDocuments);
    });

    it('should handle invalid JSON gracefully', () => {
      expect(() => {
        generator.deserializeMetadata('invalid json');
      }).toThrow('Failed to parse metadata JSON');
    });
  });
});
