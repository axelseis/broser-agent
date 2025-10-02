/**
 * .njk document processor to extract content and create chunks
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import * as cheerio from 'cheerio';
import { DocumentChunk, ProcessedDocument } from './types.js';

export class DocumentProcessor {
  private docsSourcePath: string;

  constructor(docsSourcePath: string) {
    this.docsSourcePath = docsSourcePath;
  }

  /**
   * Processes all .njk documents in the source directory
   */
  async processAllDocuments(): Promise<ProcessedDocument[]> {
    const documents: ProcessedDocument[] = [];
    const files = await this.getAllNjkFiles();
    
    for (const file of files) {
      try {
        const document = await this.processDocument(file);
        documents.push(document);
        console.log(`✅ Processed: ${file}`);
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
      }
    }
    
    return documents;
  }

  /**
   * Gets all .njk files from the source directory
   */
  private async getAllNjkFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.njk')) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDirectory(this.docsSourcePath);
    return files;
  }

  /**
   * Processes an individual document
   */
  private async processDocument(filePath: string): Promise<ProcessedDocument> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const stats = await fs.promises.stat(filePath);
    
    // Parse frontmatter
    const { data: frontmatter, content: htmlContent } = matter(content);
    
    // Clean HTML and extract text
    const $ = cheerio.load(htmlContent);
    const title = frontmatter.title || this.extractTitle($);
    const cleanContent = this.extractCleanContent($);
    
    // Create chunks
    const chunks = this.createChunks(cleanContent, title, filePath);
    
    return {
      title,
      content: cleanContent,
      chunks,
      sourceFile: path.relative(this.docsSourcePath, filePath),
      lastModified: stats.mtime
    };
  }

  /**
   * Extracts the document title from frontmatter or HTML
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    const h1 = $('h1').first().text().trim();
    if (h1) return h1;
    
    const title = $('title').text().trim();
    if (title) return title;
    
    return 'Untitled Document';
  }

  /**
   * Extracts clean content from HTML
   */
  private extractCleanContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $('script, style, nav, footer').remove();
    
    // Get clean text
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  /**
   * Creates chunks from the document content
   */
  private createChunks(content: string, title: string, filePath: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      // If adding this sentence exceeds the limit, create a chunk
      if (currentChunk.length + trimmedSentence.length > 500) {
        if (currentChunk.trim()) {
          chunks.push(this.createChunkObject(currentChunk.trim(), title, filePath, chunkIndex++));
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(this.createChunkObject(currentChunk.trim(), title, filePath, chunkIndex));
    }
    
    return chunks;
  }

  /**
   * Creates a DocumentChunk object
   */
  private createChunkObject(content: string, title: string, filePath: string, chunkIndex: number): DocumentChunk {
    const relativePath = path.relative(this.docsSourcePath, filePath);
    const url = `/user-guide/${relativePath.replace('.njk', '')}`;
    
    return {
      id: `${relativePath.replace('.njk', '')}-${chunkIndex}`,
      content,
      title,
      url,
      sourceFile: relativePath,
      chunkIndex
    };
  }
}
