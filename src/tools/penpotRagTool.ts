import { z } from "zod";
import { tool } from "ai";
import { restore } from '@orama/plugin-data-persistence';
import { search } from '@orama/orama';
import { $embeddingModel } from "@/stores";
import { embed } from "ai";

// Cache para la base de datos Orama
let cachedDB: any = null;
let isInitializing = false;

// Configuración de embeddings
const VEC_DIM = 1536;

/**
 * Genera embeddings para una consulta usando OpenAI
 */
async function getEmbedding(text: string): Promise<number[]> {
  const input = text.replace(/\s+/g, ' ').trim();
  if (!input) return new Array(VEC_DIM).fill(0);
  
  try {
    const response = await embed({
      model: $embeddingModel.get(),
      value: input
    });
    
    const embedding = response.embedding;
    if (!embedding) throw new Error('No embedding returned');
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding for query');
  }
}

/**
 * Inicializa la base de datos Orama desde el archivo ZIP comprimido
 */
async function initializeDatabase(): Promise<any> {
  if (cachedDB) {
    return cachedDB;
  }

  if (isInitializing) {
    // Esperar a que termine la inicialización
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return cachedDB;
  }

  isInitializing = true;

  try {
    console.log('🔄 Initializing Penpot RAG database...');
    
    // Cargar el archivo ZIP comprimido desde la carpeta public
    const response = await fetch('/penpotRagToolContents.zip');
    if (!response.ok) {
      throw new Error(`Failed to load embeddings file: ${response.status}`);
    }
    
    const compressedData = await response.arrayBuffer();
    
    // Descomprimir los datos
    const decompressedData = await decompressGzip(compressedData);
    const persistData = JSON.parse(decompressedData);
    
    // Restaurar la base de datos Orama
    cachedDB = await restore('binary', persistData);
    
    console.log('✅ Penpot RAG database initialized successfully');
    return cachedDB;
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw new Error('Failed to initialize Penpot documentation database');
  } finally {
    isInitializing = false;
  }
}

/**
 * Descomprime datos gzip
 */
async function decompressGzip(compressedData: ArrayBuffer): Promise<string> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  // Escribir datos comprimidos
  writer.write(new Uint8Array(compressedData));
  writer.close();
  
  // Leer datos descomprimidos
  const chunks: Uint8Array[] = [];
  let done = false;
  
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      chunks.push(value);
    }
  }
  
  // Combinar chunks y convertir a string
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new TextDecoder().decode(result);
}

/**
 * Realiza una búsqueda vectorial en la documentación de Penpot
 */
async function searchPenpotDocs(query: string, limit: number = 5): Promise<any[]> {
  try {
    const db = await initializeDatabase();
    
    // Generar embedding para la consulta
    const queryEmbedding = await getEmbedding(query);
    
    // Realizar búsqueda vectorial
    const results = await search(db, {
      mode: 'vector',
      vector: {
        value: queryEmbedding,
        property: 'embedding'
      },
      term: query,
      limit
    });

    return results.hits.map(hit => ({
      id: hit.document.id,
      heading: hit.document.heading,
      summary: hit.document.summary,
      text: hit.document.text,
      url: hit.document.url,
      sourcePath: hit.document.sourcePath,
      breadcrumbs: JSON.parse(hit.document.breadcrumbs || '[]'),
      score: hit.score,
      hasCode: hit.document.hasCode,
      codeLangs: JSON.parse(hit.document.codeLangs || '[]')
    }));
    
  } catch (error) {
    console.error('Error searching Penpot docs:', error);
    throw new Error('Failed to search Penpot documentation');
  }
}

export const penpotRagTool = tool({
  description: `Use this tool to search the Penpot user guide and documentation. This tool can find specific information about Penpot features, components, and usage instructions.

IMPORTANT: All queries to this tool must be in English.

QUERY CONSTRUCTION RULES:
- ALWAYS expand user queries with specific Penpot technical terms
- Include multiple relevant concepts from the available list below
- Use the format: "[user intent] + [specific tool] + [method] + [technical terms]"
- Never use generic queries - always include Penpot-specific terminology

QUERY TRANSFORMATION EXAMPLES:
❌ Bad: "how to draw triangle"
✅ Good: "how to draw triangle using path tool bezier curves nodes vector shapes"

❌ Bad: "create button"  
✅ Good: "how to create button component rectangle styling flex layout"

❌ Bad: "center elements"
✅ Good: "how to align center distribute layers flex layout grid positioning"

MANDATORY TECHNICAL TERMS TO INCLUDE:
- For shapes: "path tool", "bezier", "nodes", "vector shapes", "boolean operations"
- For design: "components", "layers", "styling", "flex layout", "grid layout"
- For interactions: "prototyping", "triggers", "actions", "flows", "overlays"

Available concepts in the Penpot user-guide:

**Core Objects & Tools:**
- Boards: Containers for designs, can be resized, clipped, used as screens
- Rectangles & Ellipses: Basic geometric shapes (shortcuts: R, E)
- Text: Text layers with typography options, alignment, sizing
- Paths (Bezier): Vector paths with nodes, curves, editing capabilities (shortcut: P), valid to draw complex shapes like stars, polygons, etc.
- Curves (Freehand): Freehand drawing tool (shortcut: Shift+C)
- Images: Import, aspect ratio control, positioning

**Layer Management:**
- Pages: Organize layers into separate sections
- Layers Panel: View, select, hide, lock layers
- Groups: Combine layers for simultaneous operations
- Masks: Clipping layers to show only parts of other layers
- Boolean Operations: Union, difference, intersection, exclusion, flatten
- Constraints: Control how layers behave when resizing containers

**Styling & Visual Effects:**
- Color Fills: Custom colors, gradients (linear/radial), images, opacity
- Strokes: Color, width, position, style (solid/dotted/dashed), caps/arrows
- Border Radius: Customize rectangle/image corners
- Shadows: Drop/inner shadows with position, blur, spread
- Blur: Apply blur effects to objects
- Blend Modes: Normal, multiply, screen, overlay, etc.
- Opacity: Overall layer transparency

**Layouts & Positioning:**
- Flex Layout: CSS Flexbox-based flexible layouts
- Grid Layout: CSS Grid-based 2D layouts with rows/columns
- Alignment: Align and distribute layers
- Positioning: Static, absolute positioning
- Z-index: Layer stacking order

**Components & Libraries:**
- Components: Reusable objects with main/copy relationships
- Component Variants: Group similar components with properties
- Asset Libraries: Store components, colors, typography
- Shared Libraries: Publish and connect libraries across files

**Prototyping & Interactions:**
- Prototype Mode: Connect boards for interactive prototypes
- Triggers: On click, mouse enter/leave, after delay
- Actions: Navigate, open/toggle/close overlays, previous screen, open URL
- Animations: Dissolve, slide, push transitions
- Flows: Multiple starting points for different user journeys

**Advanced Features:**
- Custom Fonts: Install and use custom typography
- Design Tokens: Manage consistent design values
- Exporting: Export designs in various formats
- Inspect Mode: Get CSS properties and code
- View Mode: Present and share prototypes
- Teams: Collaborative features

REMEMBER: Penpot doesn't have specific tools for every shape. Always search for alternative methods using existing tools like Path tool, Boolean operations, or combining basic shapes.`,
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant information in the Penpot user guide. Must be in English and include specific Penpot technical terms. Use the format: "[user intent] + [specific tool] + [method] + [technical terms]". Example: "how to draw triangle using path tool bezier curves nodes vector shapes"'),
  }),
  execute: async ({ query }) => {
    try {
      console.log(`🔍 Searching Penpot docs for: "${query}"`);
      
      const results = await searchPenpotDocs(query, 10);
      
      if (results.length === 0) {
        return {
          success: true,
          message: 'No relevant information found in the Penpot documentation for your query.',
          results: [],
          query
        };
      }
      
      // Formatear resultados para el agente
      const formattedResults = results.map((result, index) => ({
        rank: index + 1,
        title: result.heading,
        summary: result.summary,
        content: result.text,
        url: result.url,
        source: result.sourcePath,
        breadcrumbs: result.breadcrumbs,
        relevanceScore: result.score,
        hasCode: result.hasCode,
        codeLanguages: result.codeLangs
      }));
      
      console.log(`✅ Found ${results.length} relevant results`, formattedResults);
      
      return {
        success: true,
        message: `Found ${results.length} relevant sections in the Penpot documentation.`,
        results: formattedResults,
        query,
        totalResults: results.length
      };
      
    } catch (error) {
      console.error('Error in penpotRagTool:', error);
      
      return {
        success: false,
        message: 'Sorry, I encountered an error while searching the Penpot documentation. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      };
    }
  },
});