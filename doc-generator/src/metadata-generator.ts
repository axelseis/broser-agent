/**
 * Generador de metadatos para el sistema de embeddings
 */

import * as crypto from 'crypto';
import { ProcessedDocument, EmbeddingData, Metadata } from './types.js';

export interface MetadataOptions {
  includeFileHashes?: boolean;
  includeContentHash?: boolean;
  includeProcessingStats?: boolean;
  customVersionPrefix?: string;
}

export interface ProcessingStats {
  totalProcessingTime: number;
  averageTimePerDocument: number;
  averageTimePerChunk: number;
  embeddingStats?: {
    successfulEmbeddings: number;
    failedEmbeddings: number;
    averageTimePerEmbedding: number;
  };
}

export class MetadataGenerator {
  private options: MetadataOptions;

  constructor(options: MetadataOptions = {}) {
    this.options = {
      includeFileHashes: true,
      includeContentHash: true,
      includeProcessingStats: true,
      customVersionPrefix: '1.0.0',
      ...options
    };
  }

  /**
   * Genera metadatos completos para el proceso de generación
   */
  generateMetadata(
    documents: ProcessedDocument[], 
    embeddingData: EmbeddingData,
    processingStats?: ProcessingStats
  ): Metadata {
    const totalChunks = embeddingData.chunks.length;
    const totalDocuments = documents.length;
    
    // Generate file hashes if enabled
    const fileHashes = this.options.includeFileHashes 
      ? this.generateFileHashes(documents)
      : {};
    
    // Generate content hash if enabled
    const contentHash = this.options.includeContentHash
      ? this.generateContentHash(documents)
      : this.generateTimestampHash();
    
    // Generate version
    const version = this.generateVersion(contentHash);
    
    // Crear metadatos base
    const metadata: Metadata = {
      version,
      lastGenerated: new Date().toISOString(),
      totalChunks,
      totalDocuments,
      fileHashes
    };

    // Add processing statistics if available
    if (this.options.includeProcessingStats && processingStats) {
      (metadata as any).processingStats = processingStats;
    }

    return metadata;
  }

  /**
   * Genera hashes SHA-256 para cada archivo fuente
   */
  private generateFileHashes(documents: ProcessedDocument[]): Record<string, string> {
    const fileHashes: Record<string, string> = {};
    
    documents.forEach(doc => {
      const hash = crypto.createHash('sha256')
        .update(doc.content)
        .update(doc.lastModified.toISOString()) // Include modification timestamp
        .digest('hex');
      fileHashes[doc.sourceFile] = hash;
    });
    
    return fileHashes;
  }

  /**
   * Genera un hash del contenido completo de todos los documentos
   */
  private generateContentHash(documents: ProcessedDocument[]): string {
    const allContent = documents
      .map(doc => `${doc.sourceFile}:${doc.content}`)
      .join('\n');
    
    return crypto.createHash('sha256')
      .update(allContent)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Genera un hash basado en timestamp como alternativa
   */
  private generateTimestampHash(): string {
    const timestamp = Date.now().toString();
    return crypto.createHash('sha256')
      .update(timestamp)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Genera una versión semántica con hash
   */
  private generateVersion(contentHash: string): string {
    const prefix = this.options.customVersionPrefix || '1.0.0';
    return `${prefix}-${contentHash}`;
  }

  /**
   * Valida la integridad de los metadatos
   */
  validateMetadata(metadata: Metadata, documents: ProcessedDocument[], embeddingData: EmbeddingData): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Validate basic structure
    if (!metadata.version) {
      issues.push('Missing version field');
    }

    if (!metadata.lastGenerated) {
      issues.push('Missing lastGenerated field');
    }

    if (typeof metadata.totalChunks !== 'number') {
      issues.push('Invalid totalChunks field');
    }

    if (typeof metadata.totalDocuments !== 'number') {
      issues.push('Invalid totalDocuments field');
    }

    // Validar consistencia de conteos
    if (metadata.totalChunks !== embeddingData.chunks.length) {
      issues.push(`Chunk count mismatch: metadata says ${metadata.totalChunks}, actual is ${embeddingData.chunks.length}`);
    }

    if (metadata.totalDocuments !== documents.length) {
      issues.push(`Document count mismatch: metadata says ${metadata.totalDocuments}, actual is ${documents.length}`);
    }

    // Validate file hashes if present
    if (metadata.fileHashes) {
      const expectedHashes = this.generateFileHashes(documents);
      
      for (const [file, expectedHash] of Object.entries(expectedHashes)) {
        if (metadata.fileHashes[file] !== expectedHash) {
          issues.push(`Hash mismatch for file ${file}`);
        }
      }

      // Verificar archivos faltantes
      for (const file of Object.keys(metadata.fileHashes)) {
        if (!expectedHashes[file]) {
          issues.push(`Extra hash for non-existent file ${file}`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Compara dos conjuntos de metadatos para detectar cambios
   */
  compareMetadata(oldMetadata: Metadata, newMetadata: Metadata): {
    hasChanges: boolean;
    changes: string[];
    isCompatible: boolean;
  } {
    const changes: string[] = [];
    let hasChanges = false;
    let isCompatible = true;

    // Comparar versiones
    if (oldMetadata.version !== newMetadata.version) {
      changes.push(`Version changed: ${oldMetadata.version} → ${newMetadata.version}`);
      hasChanges = true;
    }

    // Comparar conteos
    if (oldMetadata.totalDocuments !== newMetadata.totalDocuments) {
      changes.push(`Document count changed: ${oldMetadata.totalDocuments} → ${newMetadata.totalDocuments}`);
      hasChanges = true;
      isCompatible = false; // Document count change may require complete regeneration
    }

    if (oldMetadata.totalChunks !== newMetadata.totalChunks) {
      changes.push(`Chunk count changed: ${oldMetadata.totalChunks} → ${newMetadata.totalChunks}`);
      hasChanges = true;
      isCompatible = false; // Chunk count change may require complete regeneration
    }

    // Comparar hashes de archivos
    if (oldMetadata.fileHashes && newMetadata.fileHashes) {
      const oldFiles = Object.keys(oldMetadata.fileHashes);
      const newFiles = Object.keys(newMetadata.fileHashes);

      // Archivos nuevos o eliminados
      const addedFiles = newFiles.filter(f => !oldFiles.includes(f));
      const removedFiles = oldFiles.filter(f => !newFiles.includes(f));

      if (addedFiles.length > 0) {
        changes.push(`Added files: ${addedFiles.join(', ')}`);
        hasChanges = true;
        isCompatible = false;
      }

      if (removedFiles.length > 0) {
        changes.push(`Removed files: ${removedFiles.join(', ')}`);
        hasChanges = true;
        isCompatible = false;
      }

      // Archivos modificados
      const modifiedFiles = oldFiles.filter(file => 
        newFiles.includes(file) && 
        oldMetadata.fileHashes[file] !== newMetadata.fileHashes[file]
      );

      if (modifiedFiles.length > 0) {
        changes.push(`Modified files: ${modifiedFiles.join(', ')}`);
        hasChanges = true;
        isCompatible = false;
      }
    }

    return {
      hasChanges,
      changes,
      isCompatible
    };
  }

  /**
   * Genera estadísticas de procesamiento
   */
  generateProcessingStats(
    documents: ProcessedDocument[],
    embeddingData: EmbeddingData,
    totalProcessingTime: number,
    embeddingStats?: { successfulEmbeddings: number; failedEmbeddings: number; averageTimePerEmbedding: number }
  ): ProcessingStats {
    const totalDocuments = documents.length;
    const totalChunks = embeddingData.chunks.length;

    const stats: ProcessingStats = {
      totalProcessingTime,
      averageTimePerDocument: totalProcessingTime / totalDocuments,
      averageTimePerChunk: totalProcessingTime / totalChunks
    };

    if (embeddingStats) {
      stats.embeddingStats = embeddingStats;
    }

    return stats;
  }

  /**
   * Serializa metadatos a JSON con formato legible
   */
  serializeMetadata(metadata: Metadata): string {
    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Deserializa metadatos desde JSON
   */
  deserializeMetadata(jsonString: string): Metadata {
    try {
      return JSON.parse(jsonString) as Metadata;
    } catch (error) {
      throw new Error(`Failed to parse metadata JSON: ${error}`);
    }
  }
}
