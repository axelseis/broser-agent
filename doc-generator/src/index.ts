/**
 * Main script to generate embeddings for Penpot documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DocumentProcessor } from './document-processor.js';
import { EmbeddingGenerator } from './embedding-generator.js';
import { FileCopier } from './file-copier.js';
import { MetadataGenerator } from './metadata-generator.js';
import { ProcessedDocument, Metadata } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting Penpot documentation embedding generation...');
    
    // Path configuration
    const docsSourcePath = path.join(__dirname, '../docs-source');
    const outputDir = path.join(__dirname, '../output');
    const targetDir = path.join(__dirname, '../../public');
    
    // Verify that the documentation directory exists
    if (!fs.existsSync(docsSourcePath)) {
      throw new Error(`Documentation source directory not found: ${docsSourcePath}`);
    }
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Step 1: Process documents
    console.log('📚 Processing documents...');
    const processor = new DocumentProcessor(docsSourcePath);
    const documents = await processor.processAllDocuments();
    
    if (documents.length === 0) {
      throw new Error('No documents were processed');
    }
    
    console.log(`✅ Processed ${documents.length} documents`);
    
    // Step 2: Generate embeddings
    console.log('🧠 Generating embeddings...');
    const generator = new EmbeddingGenerator(5); // batch size of 5
    const embeddingData = await generator.generateEmbeddings(documents);
    
    // Validate embedding quality
    const embeddingValidation = generator.validateEmbeddings(embeddingData);
    if (!embeddingValidation.isValid) {
      console.warn('⚠️ Embedding validation issues:', embeddingValidation.issues);
    }
    
    // Step 3: Create index for validation
    console.log('🔍 Creating embedding index for validation...');
    const index = await generator.createEmbeddingIndex(embeddingData);
    
    // Step 4: Run test searches
    console.log('🧪 Running test searches...');
    await generator.testSearch(index, 'components');
    await generator.testSearch(index, 'how to create');
    await generator.testSearch(index, 'styling');
    
    // Step 5: Generate metadata
    console.log('📊 Generating metadata...');
    const metadataGenerator = new MetadataGenerator({
      includeFileHashes: true,
      includeContentHash: true,
      includeProcessingStats: true,
      customVersionPrefix: '1.0.0'
    });
    
    const processingStats = metadataGenerator.generateProcessingStats(
      documents, 
      embeddingData, 
      Date.now() - startTime,
      { 
        successfulEmbeddings: embeddingData.embeddings.filter(emb => !emb.every(val => val === 0)).length,
        failedEmbeddings: embeddingData.embeddings.filter(emb => emb.every(val => val === 0)).length,
        averageTimePerEmbedding: (Date.now() - startTime) / embeddingData.embeddings.length
      }
    );
    
    const metadata = metadataGenerator.generateMetadata(documents, embeddingData, processingStats);
    
    // Validate generated metadata
    const metadataValidation = metadataGenerator.validateMetadata(metadata, documents, embeddingData);
    if (!metadataValidation.isValid) {
      console.warn('⚠️ Metadata validation issues:', metadataValidation.issues);
    }
    
    // Step 6: Save files
    console.log('💾 Saving files...');
    await saveFiles(embeddingData, metadata, outputDir);
    
    // Step 7: Copy to public directory
    console.log('📁 Copying to public directory...');
    const copier = new FileCopier(outputDir, targetDir);
    await copier.copyToPublic();
    
    // Step 8: Show final information
    const fileInfo = await copier.getFileInfo();
    console.log('📈 Generation Summary:');
    console.log(`   • Documents processed: ${metadata.totalDocuments}`);
    console.log(`   • Chunks created: ${metadata.totalChunks}`);
    console.log(`   • Embeddings generated: ${embeddingData.embeddings.length}`);
    console.log(`   • Version: ${metadata.version}`);
    console.log(`   • Generated at: ${metadata.lastGenerated}`);
    
    if ((metadata as any).processingStats) {
      const stats = (metadata as any).processingStats;
      console.log(`   • Processing time: ${stats.totalProcessingTime}ms`);
      console.log(`   • Average per document: ${stats.averageTimePerDocument.toFixed(2)}ms`);
      console.log(`   • Average per chunk: ${stats.averageTimePerChunk.toFixed(2)}ms`);
      
      if (stats.embeddingStats) {
        console.log(`   • Successful embeddings: ${stats.embeddingStats.successfulEmbeddings}`);
        console.log(`   • Failed embeddings: ${stats.embeddingStats.failedEmbeddings}`);
      }
    }
    
    console.log('✅ Embedding generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during embedding generation:', error);
    process.exit(1);
  }
}

/**
 * Saves embedding and metadata files
 */
async function saveFiles(embeddingData: any, metadata: Metadata, outputDir: string): Promise<void> {
  // Save embeddings
  const embeddingsPath = path.join(outputDir, 'embeddings.json');
  await fs.promises.writeFile(embeddingsPath, JSON.stringify(embeddingData, null, 2));
  
  // Save metadata
  const metadataPath = path.join(outputDir, 'metadata.json');
  await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  
  console.log('💾 Files saved to output directory');
}

// Execute the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
