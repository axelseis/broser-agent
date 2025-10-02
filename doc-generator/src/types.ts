/**
 * TypeScript types for the embedding generation system
 */

export interface DocumentChunk {
  id: string;
  content: string;
  title: string;
  section?: string;
  url: string;
  sourceFile: string;
  chunkIndex: number;
}

export interface ProcessedDocument {
  title: string;
  content: string;
  chunks: DocumentChunk[];
  sourceFile: string;
  lastModified: Date;
}

export interface EmbeddingData {
  chunks: DocumentChunk[];
  embeddings: number[][];
}

export interface Metadata {
  version: string;
  lastGenerated: string;
  totalChunks: number;
  totalDocuments: number;
  fileHashes: Record<string, string>;
}

export interface GenerationOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  batchSize?: number;
}
