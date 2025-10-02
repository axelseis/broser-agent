import { initializeModel, getEmbedding, EmbeddingIndex } from '../lib/index.mjs';

// Tipos básicos para el RAG tool
export interface PenpotDocument {
  id: string;
  content: string;
  title: string;
  url: string;
  sourceFile: string;
  chunkIndex: number;
  embedding: number[];
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  sourceFile: string;
  chunkIndex: number;
  score: number;
}

export interface RagStatus {
  initialized: boolean;
  modelLoaded: boolean;
  dataLoaded: boolean;
  totalDocuments: number;
  error?: string;
}

export class PenpotRagTool {
  private isInitialized: boolean = false;
  private modelLoaded: boolean = false;
  private dataLoaded: boolean = false;
  private totalDocuments: number = 0;
  private error?: string;
  private embeddingIndex?: EmbeddingIndex;

  /**
   * Inicializa el modelo y carga los datos de embeddings
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🧠 Initializing Penpot RAG tool...');
      await initializeModel();
      // Inicializar el modelo de embeddings
      console.log('📥 Loading embedding model...');
      //await initializeModel();
      this.modelLoaded = true;
      console.log('✅ Model loaded successfully');
      
      // Cargar embeddings.json desde public
      console.log('📂 Loading embeddings data...');
      const embeddingsData = await this.loadEmbeddingsData();
      
      // Crear índice de embeddings
      console.log('🔍 Creating embedding index...');
      this.embeddingIndex = await this.createEmbeddingIndex(embeddingsData);
      this.dataLoaded = true;
      this.totalDocuments = embeddingsData.chunks.length;
      console.log(`✅ Embedding index created with ${this.totalDocuments} documents`);
      
      // Guardar índice en IndexedDB
      console.log('💾 Saving index to IndexedDB...');
      await this.saveIndexToIndexedDB();
      console.log('✅ Index saved to IndexedDB successfully');
      
      this.isInitialized = true;
      console.log('🎉 Penpot RAG tool initialized successfully');
      return true;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to initialize Penpot RAG tool:', this.error);
      return false;
    }
  }

  /**
   * Realiza una búsqueda semántica en la documentación de Penpot
   */
  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized || !this.modelLoaded) {
      throw new Error('RAG tool not initialized or model not loaded');
    }

    try {
      console.log(`🔍 Searching for: "${query}" (topK: ${topK})`);
      
      // Generar embedding de la consulta
      const queryEmbedding = await getEmbedding(query);
      
      // Buscar en IndexedDB usando la configuración personalizada
      const results = await this.embeddingIndex!.search(queryEmbedding, {
        topK,
        useStorage: 'indexedDB',
        storageOptions: {
          indexedDBName: 'PenpotRAGDB',
          indexedDBObjectStoreName: 'PenpotEmbeddings'
        }
      });
      console.log('penpotRagTool.ts: search => results: ', results);
      // Formatear resultados
      const formattedResults: SearchResult[] = results.map((result: any, index: number) => ({
        id: result.object.id,
        title: result.object.title,
        content: result.object.content,
        url: result.object.url,
        sourceFile: result.object.sourceFile,
        chunkIndex: result.object.chunkIndex,
        score: 1 - (index / results.length) // Score aproximado basado en posición
      }));
      
      console.log(`✅ Found ${formattedResults.length} results`);
      return formattedResults;
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene el estado actual del RAG tool
   */
  getStatus(): RagStatus {
    return {
      initialized: this.isInitialized,
      modelLoaded: this.modelLoaded,
      dataLoaded: this.dataLoaded,
      totalDocuments: this.totalDocuments,
      error: this.error
    };
  }

  /**
   * Limpia el cache de IndexedDB
   */
  async clearCache(): Promise<boolean> {
    try {
      // TODO: Implementar limpieza de IndexedDB
      this.dataLoaded = false;
      this.totalDocuments = 0;
      return true;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Carga los datos de embeddings desde el archivo JSON público
   */
  private async loadEmbeddingsData(): Promise<any> {
    try {
      const response = await fetch('./embeddings.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch embeddings: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('penpotRagTool.ts: loadEmbeddingsData => data: ', data);
      console.log(`📊 Loaded ${data.chunks.length} chunks from embeddings.json`);
      return data;
    } catch (error) {
      throw new Error(`Failed to load embeddings data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Crea un índice de embeddings basado en los datos cargados
   */
  private async createEmbeddingIndex(embeddingsData: any): Promise<EmbeddingIndex> {
    try {
      // Crear objetos con embeddings para el índice (siguiendo el patrón de doc-generator)
      const objectsWithEmbeddings = embeddingsData.chunks.map((chunk: any, index: number) => ({
        id: chunk.id,
        content: chunk.content,
        title: chunk.title,
        url: chunk.url,
        sourceFile: chunk.sourceFile,
        chunkIndex: chunk.chunkIndex,
        embedding: embeddingsData.embeddings[index]
      }));
      
      const index = new EmbeddingIndex(objectsWithEmbeddings);
      console.log('✅ Embedding index created successfully');
      
      return index;
    } catch (error) {
      throw new Error(`Failed to create embedding index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Guarda el índice de embeddings en IndexedDB
   */
  private async saveIndexToIndexedDB(): Promise<void> {
    if (!this.embeddingIndex) {
      throw new Error('No embedding index available to save');
    }

    try {
      // Guardar el índice en IndexedDB con configuración personalizada
      await this.embeddingIndex.saveIndex('indexedDB', {
        DBName: 'PenpotRAGDB',
        objectStoreName: 'PenpotEmbeddings'
      });
      
      console.log('✅ Index saved to IndexedDB with custom configuration');
    } catch (error) {
      throw new Error(`Failed to save index to IndexedDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
