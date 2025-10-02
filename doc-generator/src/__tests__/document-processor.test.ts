/**
 * Tests unitarios para DocumentProcessor
 */

import { DocumentProcessor } from '../document-processor.js';
import * as fs from 'fs';
import * as path from 'path';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;
  const testDataPath = path.join(process.cwd(), 'test-data');

  beforeEach(() => {
    processor = new DocumentProcessor(testDataPath);
  });

  describe('Basic functionality', () => {
    it('should create DocumentProcessor instance', () => {
      expect(processor).toBeInstanceOf(DocumentProcessor);
    });

    it('should find test files', async () => {
      const files = await processor.getAllNjkFiles();
      expect(files.length).toBeGreaterThan(0);
    });

    it('should process a simple document', async () => {
      const filePath = path.join(testDataPath, 'short-document.njk');
      const document = await processor.processDocument(filePath);
      
      expect(document).toBeDefined();
      expect(document.title).toBe('Short Document');
      expect(document.content).toContain('This is a very short document');
      expect(document.chunks.length).toBeGreaterThan(0);
    });

    it('should create valid chunks', async () => {
      const filePath = path.join(testDataPath, 'short-document.njk');
      const document = await processor.processDocument(filePath);
      
      document.chunks.forEach(chunk => {
        expect(chunk.id).toBeDefined();
        expect(chunk.content).toBeDefined();
        expect(chunk.title).toBeDefined();
        expect(chunk.url).toBeDefined();
        expect(chunk.sourceFile).toBeDefined();
        expect(typeof chunk.chunkIndex).toBe('number');
      });
    });

    it('should handle frontmatter correctly', async () => {
      const filePath = path.join(testDataPath, 'sample-document.njk');
      const document = await processor.processDocument(filePath);
      
      expect(document.title).toBe('Test Document');
      expect(document.content).not.toContain('console.log'); // Script removed
      expect(document.content).not.toContain('.hidden'); // Style removed
    });

    it('should generate correct URLs', async () => {
      const filePath = path.join(testDataPath, 'components-test.njk');
      const document = await processor.processDocument(filePath);
      
      document.chunks.forEach(chunk => {
        expect(chunk.url).toBe('/user-guide/components-test');
        expect(chunk.sourceFile).toBe('components-test.njk');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle missing files gracefully', async () => {
      const nonExistentPath = path.join(testDataPath, 'non-existent.njk');
      
      try {
        await processor.processDocument(nonExistentPath);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});