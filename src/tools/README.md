# Penpot RAG Tool - Documentación

## Descripción

El `penpotRagTool` es una herramienta que permite buscar información en la documentación oficial de Penpot usando búsqueda vectorial semántica. Esta herramienta utiliza embeddings generados a partir de la documentación de Penpot para proporcionar respuestas precisas y contextuales.

## Funcionamiento

### 1. Inicialización de la Base de Datos
- Carga el archivo `penpotRagToolContents.zip` desde la carpeta `public/`
- Descomprime los datos usando la API nativa de decompresión del navegador
- Restaura la base de datos Orama usando `@orama/plugin-data-persistence`

### 2. Búsqueda Vectorial
- Genera embeddings para la consulta del usuario usando OpenAI ada-002
- Realiza búsqueda vectorial en la base de datos Orama
- Retorna los resultados más relevantes ordenados por score de similitud

### 3. Formato de Respuesta
```typescript
{
  success: boolean,
  message: string,
  results: Array<{
    rank: number,
    title: string,
    summary: string,
    content: string,
    url: string,
    source: string,
    breadcrumbs: string[],
    relevanceScore: number,
    hasCode: boolean,
    codeLanguages: string[]
  }>,
  query: string,
  totalResults: number
}
```

## Uso en el Agente

El agente está configurado para usar automáticamente esta herramienta cuando:
- Los usuarios preguntan sobre características de Penpot
- Necesitan instrucciones paso a paso
- Buscan consejos de diseño específicos
- Quieren información sobre funcionalidades

### Ejemplo de Uso
```typescript
// El agente automáticamente usará penpotRagTool para esta consulta:
"¿Cómo puedo crear componentes en Penpot?"

// La herramienta buscará en la documentación y retornará:
// - Instrucciones paso a paso
// - Enlaces a la documentación oficial
// - Ejemplos de código si están disponibles
// - Breadcrumbs para contexto
```

## Configuración

### Variables de Entorno Requeridas
```bash
OPENAI_API_KEY=tu-api-key-de-openai
```

### Archivos Requeridos
- `public/penpotRagToolContents.zip`: Archivo comprimido con embeddings generados localmente

## Generación de Embeddings

Los embeddings se generan usando el script en `embeddings-generator/`:

```bash
# Generar embeddings localmente
npm run generate-embeddings

# Esto crea:
# - public/penpotRagToolContents.zip (archivo comprimido)
# - Base de datos Orama con embeddings de la documentación
```

## Características Técnicas

### Cache de Base de Datos
- La base de datos se inicializa una sola vez por sesión
- Se mantiene en memoria para búsquedas rápidas
- Previene múltiples inicializaciones simultáneas

### Manejo de Errores
- Errores de red al cargar el archivo ZIP
- Errores de API de OpenAI
- Errores de descompresión
- Errores de búsqueda en Orama

### Optimizaciones
- Descompresión nativa del navegador (DecompressionStream)
- Cache de base de datos en memoria
- Búsqueda vectorial eficiente con Orama
- Respuestas estructuradas para el agente

## Limitaciones

1. **Dependencia de OpenAI**: Requiere API key válida
2. **Tamaño del archivo**: El archivo ZIP debe cargarse completamente
3. **Navegador**: Requiere soporte para DecompressionStream
4. **Memoria**: La base de datos se mantiene en memoria

## Troubleshooting

### Error: "Failed to load embeddings file"
- Verificar que `penpotRagToolContents.zip` existe en `public/`
- Verificar que el servidor está sirviendo archivos estáticos

### Error: "Failed to generate embedding"
- Verificar que `OPENAI_API_KEY` está configurada
- Verificar conectividad a la API de OpenAI

### Error: "Failed to initialize database"
- Verificar que el archivo ZIP no está corrupto
- Verificar que el navegador soporta DecompressionStream

## Desarrollo

### Estructura del Archivo
```
src/tools/penpotRagTool.ts
├── Cache de base de datos
├── Función de embeddings
├── Inicialización de DB
├── Descompresión gzip
├── Búsqueda vectorial
└── Herramienta exportada
```

### Testing
```bash
# Ejecutar tests unitarios
npm test src/tools/penpotRagTool.test.ts

# Test de integración (requiere archivo de embeddings)
npm run test:integration
```
