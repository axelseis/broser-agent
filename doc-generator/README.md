# Penpot Documentation Embedding Generator

Este proyecto genera embeddings vectoriales para la documentación de Penpot usando la librería `client-vector-search`.

## Descripción

El generador procesa todos los archivos `.njk` de la documentación de Penpot, extrae el contenido limpio, lo divide en chunks y genera embeddings vectoriales que se pueden usar para búsqueda semántica.

## Estructura del Proyecto

```
doc-generator/
├── docs-source/          # Symlink a ../penpot/docs/user-guide
├── output/              # Archivos temporales generados
├── src/
│   ├── types.ts         # Interfaces TypeScript
│   ├── document-processor.ts  # Procesador de archivos .njk
│   ├── embedding-generator.ts # Generador de embeddings
│   ├── file-copier.ts   # Copiador de archivos
│   └── index.ts         # Script principal
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Instalación

```bash
cd doc-generator
npm install
```

## Uso

### Generar embeddings

```bash
npm run generate-embeddings
```

Este comando:
1. Procesa todos los archivos `.njk` de la documentación
2. Genera embeddings usando `client-vector-search`
3. Guarda los archivos en `output/`
4. Copia los archivos a `../public/` para el cliente

### Desarrollo

```bash
# Compilar en modo watch
npm run dev

# Ejecutar tests
npm test

# Limpiar archivos generados
npm run clean
```

## Archivos Generados

- `embeddings.json`: Contiene todos los chunks y sus embeddings
- `metadata.json`: Metadatos del proceso de generación (versión, fecha, etc.)

## Configuración

### Opciones de Chunking

Puedes modificar el tamaño de los chunks editando `document-processor.ts`:

```typescript
// Tamaño máximo de chunk (caracteres)
if (currentChunk.length + trimmedSentence.length > 500) {
  // Crear nuevo chunk
}
```

### Batch Size

Puedes ajustar el tamaño del lote para la generación de embeddings:

```typescript
const generator = new EmbeddingGenerator(5); // batch size de 5
```

## Testing

El proyecto incluye tests unitarios para cada componente:

```bash
npm test
npm run test:watch
```

## Dependencias

- `client-vector-search`: Generación de embeddings
- `gray-matter`: Parsing de frontmatter
- `cheerio`: Procesamiento de HTML
- `fs-extra`: Utilidades de sistema de archivos

## Requisitos

- Node.js >= 18.0.0
- Acceso a la documentación de Penpot en `../penpot/docs/user-guide`
