/**
 * Embedding generator using client-vector-search
 */

import { getEmbedding, EmbeddingIndex } from '../../src/lib/index.mjs';
import { DocumentChunk, EmbeddingData, ProcessedDocument } from './types.js';

export interface EmbeddingStats {
  totalChunks: number;
  successfulEmbeddings: number;
  failedEmbeddings: number;
  processingTime: number;
  averageTimePerChunk: number;
}

export class EmbeddingGenerator {
  private batchSize: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(batchSize: number = 5, maxRetries: number = 3, retryDelay: number = 1000) {
    this.batchSize = batchSize;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Generates embeddings for all chunks in the documents
   */
  async generateEmbeddings(documents: ProcessedDocument[]): Promise<EmbeddingData> {
    const startTime = Date.now();
    console.log('🧠 Starting embedding generation...');
    
    // Extraer todos los chunks
    const allChunks: DocumentChunk[] = [];
    documents.forEach(doc => {
      allChunks.push(...doc.chunks);
    });
    
    console.log(`📝 Processing ${allChunks.length} chunks in batches of ${this.batchSize}`);
    
    // Generar embeddings por lotes
    const embeddings: number[][] = [];
    let successfulEmbeddings = 0;
    let failedEmbeddings = 0;
    
    for (let i = 0; i < allChunks.length; i += this.batchSize) {
      const batch = allChunks.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(allChunks.length / this.batchSize);
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`);
      
      const batchResult = await this.processBatch(batch);
      embeddings.push(...batchResult.embeddings);
      successfulEmbeddings += batchResult.successful;
      failedEmbeddings += batchResult.failed;
      
      // Pausa progresiva para evitar sobrecarga
      const delay = Math.min(100 + (batchNumber * 10), 500);
      await this.delay(delay);
    }
    
    const processingTime = Date.now() - startTime;
    const averageTimePerChunk = processingTime / allChunks.length;
    
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    console.log(`📊 Stats: ${successfulEmbeddings} successful, ${failedEmbeddings} failed`);
    console.log(`⏱️ Processing time: ${processingTime}ms (${averageTimePerChunk.toFixed(2)}ms per chunk)`);
    
    return {
      chunks: allChunks,
      embeddings
    };
  }

  /**
   * Procesa un lote de chunks con reintentos
   */
  private async processBatch(chunks: DocumentChunk[]): Promise<{
    embeddings: number[][];
    successful: number;
    failed: number;
  }> {
    const embeddings: number[][] = [];
    let successful = 0;
    let failed = 0;
    
    for (const chunk of chunks) {
      const embedding = await this.generateEmbeddingWithRetry(chunk);
      embeddings.push(embedding);
      
      if (embedding.every(val => val === 0)) {
        failed++;
      } else {
        successful++;
      }
    }
    
    return { embeddings, successful, failed };
  }

  /**
   * Genera un embedding con reintentos
   */
  private async generateEmbeddingWithRetry(chunk: DocumentChunk): Promise<number[]> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const embedding = await getEmbedding(chunk.content);
        
        // Validate that the embedding is not empty
        if (embedding && embedding.length > 0) {
          return embedding;
        } else {
          throw new Error('Empty embedding returned');
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt}/${this.maxRetries} failed for chunk ${chunk.id}: ${error}`);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    console.error(`❌ Failed to generate embedding for chunk ${chunk.id} after ${this.maxRetries} attempts:`, lastError);
    
    // Create an empty embedding as fallback
    return new Array(384).fill(0); // gte-small has 384 dimensions
  }

  /**
   * Crea un índice de embeddings para búsqueda
   */
  async createEmbeddingIndex(embeddingData: EmbeddingData): Promise<EmbeddingIndex> {
    console.log('🔍 Creating embedding index...');
    
    // Create objects with embeddings for the index
    const objectsWithEmbeddings = embeddingData.chunks.map((chunk, index) => ({
      id: chunk.id,
      content: chunk.content,
      title: chunk.title,
      url: chunk.url,
      sourceFile: chunk.sourceFile,
      chunkIndex: chunk.chunkIndex,
      embedding: embeddingData.embeddings[index]
    }));
    
    const index = new EmbeddingIndex(objectsWithEmbeddings);
    console.log('✅ Embedding index created');
    
    return index;
  }

  /**
   * Realiza una búsqueda de prueba para validar el índice
   */
  async testSearch(index: EmbeddingIndex, query: string, topK: number = 3): Promise<any[]> {
    console.log(`🔍 Testing search with query: "${query}"`);
    
    try {
      const queryEmbedding = await getEmbedding(query);
      const results = await index.search(queryEmbedding, { topK });
      
      console.log('📊 Search results:', results.map((r: any, index: number) => ({ 
        rank: index + 1,
        id: r.id, 
        title: r.title, 
        content: r.content?.substring(0, 100) + '...',
        url: r.url
      })));
      
      return results;
    } catch (error) {
      console.error(`❌ Error during test search:`, error);
      return [];
    }
  }

  /**
   * Valida la calidad de los embeddings generados
   */
  validateEmbeddings(embeddingData: EmbeddingData): {
    isValid: boolean;
    issues: string[];
    stats: EmbeddingStats;
  } {
    const issues: string[] = [];
    const embeddings = embeddingData.embeddings;
    const chunks = embeddingData.chunks;
    
    // Verify that there are the same number of chunks and embeddings
    if (embeddings.length !== chunks.length) {
      issues.push(`Mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`);
    }
    
    // Verificar dimensiones de embeddings
    const expectedDimensions = 384; // gte-small
    const invalidDimensions = embeddings.filter(emb => emb.length !== expectedDimensions);
    if (invalidDimensions.length > 0) {
      issues.push(`${invalidDimensions.length} embeddings have incorrect dimensions`);
    }
    
    // Verify empty embeddings (all zeros)
    const emptyEmbeddings = embeddings.filter(emb => emb.every(val => val === 0));
    if (emptyEmbeddings.length > 0) {
      issues.push(`${emptyEmbeddings.length} embeddings are empty (all zeros)`);
    }
    
    // Verificar embeddings con valores NaN o infinitos
    const invalidEmbeddings = embeddings.filter(emb => 
      emb.some(val => !isFinite(val))
    );
    if (invalidEmbeddings.length > 0) {
      issues.push(`${invalidEmbeddings.length} embeddings contain invalid values`);
    }
    
    const stats: EmbeddingStats = {
      totalChunks: chunks.length,
      successfulEmbeddings: embeddings.length - emptyEmbeddings.length,
      failedEmbeddings: emptyEmbeddings.length,
      processingTime: 0, // Would be filled in real time
      averageTimePerChunk: 0 // Would be filled in real time
    };
    
    return {
      isValid: issues.length === 0,
      issues,
      stats
    };
  }

  /**
   * Obtiene estadísticas de generación
   */
  getStats(embeddingData: EmbeddingData, processingTime: number): EmbeddingStats {
    const emptyEmbeddings = embeddingData.embeddings.filter(emb => emb.every(val => val === 0));
    
    return {
      totalChunks: embeddingData.chunks.length,
      successfulEmbeddings: embeddingData.embeddings.length - emptyEmbeddings.length,
      failedEmbeddings: emptyEmbeddings.length,
      processingTime,
      averageTimePerChunk: processingTime / embeddingData.chunks.length
    };
  }

  /**
   * Utilidad para crear pausas
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
