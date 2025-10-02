var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/cache.ts
import { LRUCache } from "lru-cache";
var _Cache = class {
  constructor() {
  }
  static getInstance(max = 1e4, maxAge = 1e3 * 60 * 10) {
    if (!_Cache.instance) {
      const options = {
        max,
        length: () => 1,
        maxAge
      };
      _Cache.instance = new LRUCache(options);
    }
    return _Cache.instance;
  }
};
var Cache = _Cache;
__publicField(Cache, "instance");
var cache_default = Cache;

// src/indexedDB.ts
var IndexedDbManager = class {
  DBname;
  objectStoreName;
  constructor(DBname, objectStoreName) {
    this.DBname = DBname;
    this.objectStoreName = objectStoreName;
  }
  static async create(DBname = "clientVectorDB", objectStoreName = "ClientEmbeddingStore", index = null) {
    const instance = new IndexedDbManager(DBname, objectStoreName);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DBname);
      let db;
      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject(new Error("Database initialization failed"));
      };
      request.onsuccess = async () => {
        db = request.result;
        if (!db.objectStoreNames.contains(objectStoreName)) {
          db.close();
          await instance.createObjectStore(index);
        }
        db.close();
        resolve(instance);
      };
    });
  }
  async createObjectStore(index = null) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DBname);
      request.onsuccess = () => {
        let db1 = request.result;
        var version = db1.version;
        db1.close();
        const request_2 = indexedDB.open(this.DBname, version + 1);
        request_2.onupgradeneeded = async () => {
          let db2 = request_2.result;
          if (!db2.objectStoreNames.contains(this.objectStoreName)) {
            const objectStore = db2.createObjectStore(this.objectStoreName, {
              autoIncrement: true
            });
            if (index) {
              objectStore.createIndex(`by_${index}`, index, { unique: false });
            }
          }
        };
        request_2.onsuccess = async () => {
          let db2 = request_2.result;
          console.log("Object store creation successful");
          db2.close();
          resolve();
        };
        request_2.onerror = (event) => {
          console.error("Error creating object store:", event);
          reject(new Error("Error creating object store"));
        };
      };
      request.onerror = (event) => {
        console.error("Error opening database:", event);
        reject(new Error("Error opening database"));
      };
    });
  }
  async addToIndexedDB(objs) {
    return new Promise(async (resolve, reject) => {
      const request = indexedDB.open(this.DBname);
      request.onsuccess = async () => {
        let db = request.result;
        const transaction = db.transaction([this.objectStoreName], "readwrite");
        const objectStore = transaction.objectStore(this.objectStoreName);
        if (!Array.isArray(objs)) {
          objs = [objs];
        }
        objs.forEach((obj) => {
          const request2 = objectStore.add(obj);
          request2.onerror = (event) => {
            console.error("Failed to add object", event);
            throw new Error("Failed to add object");
          };
        });
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = (event) => {
          console.error("Failed to add object", event);
          reject(new Error("Failed to add object"));
        };
        db.close();
      };
    });
  }
  async *dbGenerator() {
    const objectStoreName = this.objectStoreName;
    const dbOpenPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DBname);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error("Could not open DB"));
      };
    });
    try {
      const db = await dbOpenPromise;
      const transaction = db.transaction([objectStoreName], "readonly");
      const objectStore = transaction.objectStore(objectStoreName);
      const request = objectStore.openCursor();
      let promiseResolver;
      request.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
          promiseResolver(cursor.value);
          cursor.continue();
        } else {
          promiseResolver(null);
        }
      };
      while (true) {
        const promise = new Promise((resolve) => {
          promiseResolver = resolve;
        });
        const value = await promise;
        if (value === null)
          break;
        yield value;
      }
      db.close();
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }
  async deleteIndexedDBObjectStoreFromDB(DBname, objectStoreName) {
    return new Promise(async (resolve, reject) => {
      const request = indexedDB.open(this.DBname);
      request.onsuccess = async () => {
        let db = request.result;
        var version = db.version;
        db.close();
        const request_2 = indexedDB.open(db.name, version + 1);
        request_2.onupgradeneeded = async () => {
          let db2 = request_2.result;
          if (db2.objectStoreNames.contains(objectStoreName)) {
            db2.deleteObjectStore(objectStoreName);
          } else {
            console.error(
              `Object store '${objectStoreName}' not found in database '${DBname}'`
            );
            reject(
              new Error(
                `Object store '${objectStoreName}' not found in database '${DBname}'`
              )
            );
          }
        };
        request_2.onsuccess = () => {
          let db2 = request_2.result;
          console.log("Object store deletion successful");
          db2.close();
          resolve();
        };
        request_2.onerror = (event) => {
          console.error("Failed to delete object store", event);
          let db2 = request_2.result;
          db2.close();
          reject(new Error("Failed to delete object store"));
        };
      };
      request.onerror = (event) => {
        console.error("Failed to open database", event);
        reject(new Error("Failed to open database"));
      };
    });
  }
};

// src/utils.ts
var cosineSimilarity = (vecA, vecB, precision = 6) => {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }
  const dotProduct = vecA.reduce((sum, a, i) => {
    const b = vecB[i];
    return sum + a * (b !== void 0 ? b : 0);
  }, 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return parseFloat(
    (dotProduct / (magnitudeA * magnitudeB)).toFixed(precision)
  );
};

// src/hnsw.ts
import { encode, decode } from "@msgpack/msgpack";
var PriorityQueue = class {
  elements;
  compareFn;
  constructor(elements, compareFn) {
    this.elements = elements;
    this.compareFn = compareFn;
    this.elements.sort(this.compareFn);
  }
  push(element) {
    this.elements.push(element);
    this.elements.sort(this.compareFn);
  }
  pop() {
    return this.elements.shift() || null;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
};
var EuclideanDistance = (a, b) => {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  return Math.sqrt(
    a.reduce((acc, val, i) => {
      const bVal = b[i];
      if (bVal === void 0)
        throw new Error("b[i] is undefined");
      return acc + Math.pow(val - bVal, 2);
    }, 0)
  );
};
var getInsertLayer = (L, mL) => {
  return Math.min(-Math.floor(Math.log(Math.random()) * mL), L - 1);
};
var _searchLayer = (graph, entry, query, ef) => {
  if (entry < 0 || entry >= graph.length) {
    throw new Error(`Invalid entry index: ${entry}`);
  }
  const graphEntry = graph[entry];
  if (!graphEntry) {
    throw new Error(`Graph entry at index ${entry} is undefined`);
  }
  const best = [
    EuclideanDistance(graphEntry.vector, query),
    entry
  ];
  const nns = [best];
  const visited = /* @__PURE__ */ new Set([best[1]]);
  const candidates = new PriorityQueue(
    [best],
    (a, b) => a[0] - b[0]
  );
  while (!candidates.isEmpty()) {
    const current = candidates.pop();
    const lastNnsElement = nns.length > 0 ? nns[nns.length - 1] : null;
    if (!current || lastNnsElement && lastNnsElement[0] < current[0])
      break;
    const graphCurrent = graph[current[1]];
    if (!graphCurrent)
      continue;
    for (const e of graphCurrent.connections) {
      const graphE = graph[e];
      if (!graphE)
        continue;
      const dist = EuclideanDistance(graphE.vector, query);
      if (!visited.has(e)) {
        visited.add(e);
        const lastNn = nns[nns.length - 1];
        if (!lastNn || dist < lastNn[0] || nns.length < ef) {
          candidates.push([dist, e]);
          nns.push([dist, e]);
          nns.sort((a, b) => a[0] - b[0]);
          if (nns.length > ef) {
            nns.pop();
          }
        }
      }
    }
  }
  return nns;
};
var ExperimentalHNSWIndex = class {
  L;
  mL;
  efc;
  index;
  constructor(L = 5, mL = 0.62, efc = 10) {
    this.L = L;
    this.mL = mL;
    this.efc = efc;
    this.index = Array.from({ length: L }, () => []);
  }
  setIndex(index) {
    this.index = index;
  }
  insert(vec) {
    const l = getInsertLayer(this.L, this.mL);
    let startV = 0;
    for (let n = 0; n < this.L; n++) {
      const graph = this.index[n];
      if (graph?.length === 0) {
        const nextLayer = this.index[n + 1];
        const nextLayerLength = nextLayer ? nextLayer.length : null;
        graph?.push({
          vector: vec,
          connections: [],
          layerBelow: n < this.L - 1 ? nextLayerLength : null
        });
        continue;
      }
      if (n < l && graph) {
        const searchLayerResult = _searchLayer(graph, startV, vec, 1);
        startV = searchLayerResult && searchLayerResult[0] ? searchLayerResult[0][1] : startV;
      } else if (graph) {
        const nextLayer = this.index[n + 1];
        const nextLayerLength = nextLayer ? nextLayer.length : null;
        const node = {
          vector: vec,
          connections: [],
          layerBelow: n < this.L - 1 ? nextLayerLength : null
        };
        const nns = _searchLayer(graph, startV, vec, this.efc);
        for (const nn of nns) {
          node.connections.push(nn[1]);
          graph[nn[1]]?.connections.push(graph.length);
        }
        graph?.push(node);
        const graphStartV = graph[startV];
        if (graphStartV)
          startV = graphStartV.layerBelow;
      }
    }
  }
  search(query, ef = 1) {
    if (this.index && this.index[0] && this.index[0].length === 0) {
      return [];
    }
    let bestV = 0;
    for (const graph of this.index) {
      const searchLayer = _searchLayer(graph, bestV, query, ef);
      if (searchLayer && searchLayer[0]) {
        bestV = searchLayer[0][1];
        if (graph[bestV]?.layerBelow === null) {
          return _searchLayer(graph, bestV, query, ef);
        }
        bestV = graph[bestV]?.layerBelow;
      }
    }
    return [];
  }
  toJSON() {
    return {
      L: this.L,
      mL: this.mL,
      efc: this.efc,
      index: this.index
    };
  }
  static fromJSON(json) {
    const hnsw = new ExperimentalHNSWIndex(json.L, json.mL, json.efc);
    return hnsw;
  }
  toBinary() {
    return encode({
      L: this.L,
      mL: this.mL,
      efc: this.efc,
      index: this.index
    });
  }
  static fromBinary(binary) {
    const data = decode(binary);
    const hnsw = new ExperimentalHNSWIndex(data.L, data.mL, data.efc);
    hnsw.setIndex(data.index);
    return hnsw;
  }
};

// src/index.ts
var DEFAULT_TOP_K = 3;
var cacheInstance = cache_default.getInstance();
var pipe;
var currentModel;
var initializeModel = async (model = "Xenova/gte-small") => {
  if (model !== currentModel) {
    const transformersModule = await import("@xenova/transformers");
    transformersModule.env.allowLocalModels = false;
    transformersModule.env.useBrowserCache = false;
    const pipeline = transformersModule.pipeline;
    pipe = await pipeline("feature-extraction", model);
    currentModel = model;
  }
};
var getEmbedding = async (text, precision = 7, options = { pooling: "mean", normalize: false }, model = "Xenova/gte-small") => {
  const cachedEmbedding = cacheInstance.get(text);
  if (cachedEmbedding) {
    return Promise.resolve(cachedEmbedding);
  }
  if (model !== currentModel) {
    await initializeModel(model);
  }
  const output = await pipe(text, options);
  const roundedOutput = Array.from(output.data).map(
    (value) => parseFloat(value.toFixed(precision))
  );
  cacheInstance.set(text, roundedOutput);
  return Array.from(roundedOutput);
};
var EmbeddingIndex = class {
  objects;
  keys;
  constructor(initialObjects) {
    this.objects = [];
    this.keys = [];
    if (initialObjects && initialObjects.length > 0) {
      initialObjects.forEach((obj) => this.validateAndAdd(obj));
      if (initialObjects[0]) {
        this.keys = Object.keys(initialObjects[0]);
      }
    }
  }
  findVectorIndex(filter) {
    return this.objects.findIndex(
      (object) => Object.keys(filter).every((key) => object[key] === filter[key])
    );
  }
  validateAndAdd(obj) {
    if (!Array.isArray(obj.embedding) || obj.embedding.some(isNaN)) {
      throw new Error(
        "Object must have an embedding property of type number[]"
      );
    }
    if (this.keys.length === 0) {
      this.keys = Object.keys(obj);
    } else if (!this.keys.every((key) => key in obj)) {
      throw new Error(
        "Object must have the same properties as the initial objects"
      );
    }
    this.objects.push(obj);
  }
  add(obj) {
    this.validateAndAdd(obj);
  }
  // Method to update an existing vector in the index
  update(filter, vector) {
    const index = this.findVectorIndex(filter);
    if (index === -1) {
      throw new Error("Vector not found");
    }
    this.validateAndAdd(vector);
    this.objects[index] = vector;
  }
  // Method to remove a vector from the index
  remove(filter) {
    const index = this.findVectorIndex(filter);
    if (index === -1) {
      throw new Error("Vector not found");
    }
    this.objects.splice(index, 1);
  }
  // Method to remove multiple vectors from the index
  removeBatch(filters) {
    filters.forEach((filter) => {
      const index = this.findVectorIndex(filter);
      if (index !== -1) {
        this.objects.splice(index, 1);
      }
    });
  }
  // Method to retrieve a vector from the index
  get(filter) {
    const vector = this.objects[this.findVectorIndex(filter)];
    return vector || null;
  }
  size() {
    return this.objects.length;
  }
  clear() {
    this.objects = [];
  }
  async search(queryEmbedding, options = {
    topK: 3,
    useStorage: "none",
    storageOptions: {
      indexedDBName: "clientVectorDB",
      indexedDBObjectStoreName: "ClientEmbeddingStore"
    }
  }) {
    const topK = options.topK || DEFAULT_TOP_K;
    const filter = options.filter || {};
    const useStorage = options.useStorage || "none";
    if (useStorage === "indexedDB") {
      const DBname = options.storageOptions?.indexedDBName || "clientVectorDB";
      const objectStoreName = options.storageOptions?.indexedDBObjectStoreName || "ClientEmbeddingStore";
      if (typeof indexedDB === "undefined") {
        console.error("IndexedDB is not supported");
        throw new Error("IndexedDB is not supported");
      }
      const results = await this.loadAndSearchFromIndexedDB(
        DBname,
        objectStoreName,
        queryEmbedding,
        topK,
        filter
      );
      return results;
    } else {
      const similarities = this.objects.filter(
        (object) => Object.keys(filter).every((key) => object[key] === filter[key])
      ).map((obj) => ({
        similarity: cosineSimilarity(queryEmbedding, obj.embedding),
        object: obj
      }));
      return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    }
  }
  printIndex() {
    console.log("Index Content:");
    this.objects.forEach((obj, idx) => {
      console.log(`Item ${idx + 1}:`, obj);
    });
  }
  async saveIndex(storageType, options = {
    DBName: "clientVectorDB",
    objectStoreName: "ClientEmbeddingStore"
  }) {
    if (storageType === "indexedDB") {
      await this.saveToIndexedDB(options.DBName, options.objectStoreName);
    } else {
      throw new Error(
        `Unsupported storage type: ${storageType} 
 Supported storage types: "indexedDB"`
      );
    }
  }
  async saveToIndexedDB(DBname = "clientVectorDB", objectStoreName = "ClientEmbeddingStore") {
    if (typeof indexedDB === "undefined") {
      console.error("IndexedDB is not defined");
      throw new Error("IndexedDB is not supported");
    }
    if (!this.objects || this.objects.length === 0) {
      throw new Error("Index is empty. Nothing to save");
    }
    try {
      const db = await IndexedDbManager.create(DBname, objectStoreName);
      await db.addToIndexedDB(this.objects);
      console.log(
        `Index saved to database '${DBname}' object store '${objectStoreName}'`
      );
    } catch (error) {
      console.error("Error saving index to database:", error);
      throw new Error("Error saving index to database");
    }
  }
  async loadAndSearchFromIndexedDB(DBname = "clientVectorDB", objectStoreName = "ClientEmbeddingStore", queryEmbedding, topK, filter) {
    const db = await IndexedDbManager.create(DBname, objectStoreName);
    const generator = db.dbGenerator();
    const results = [];
    for await (const record of generator) {
      if (Object.keys(filter).every((key) => record[key] === filter[key])) {
        const similarity = cosineSimilarity(queryEmbedding, record.embedding);
        results.push({ similarity, object: record });
      }
    }
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }
  async deleteIndexedDB(DBname = "clientVectorDB") {
    if (typeof indexedDB === "undefined") {
      console.error("IndexedDB is not defined");
      throw new Error("IndexedDB is not supported");
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DBname);
      request.onsuccess = () => {
        console.log(`Database '${DBname}' deleted`);
        resolve();
      };
      request.onerror = (event) => {
        console.error("Failed to delete database", event);
        reject(new Error("Failed to delete database"));
      };
    });
  }
  async deleteIndexedDBObjectStore(DBname = "clientVectorDB", objectStoreName = "ClientEmbeddingStore") {
    const db = await IndexedDbManager.create(DBname, objectStoreName);
    try {
      await db.deleteIndexedDBObjectStoreFromDB(DBname, objectStoreName);
      console.log(
        `Object store '${objectStoreName}' deleted from database '${DBname}'`
      );
    } catch (error) {
      console.error("Error deleting object store:", error);
      throw new Error("Error deleting object store");
    }
  }
  async getAllObjectsFromIndexedDB(DBname = "clientVectorDB", objectStoreName = "ClientEmbeddingStore") {
    const db = await IndexedDbManager.create(DBname, objectStoreName);
    const objects = [];
    for await (const record of db.dbGenerator()) {
      objects.push(record);
    }
    return objects;
  }
};
export {
  EmbeddingIndex,
  ExperimentalHNSWIndex,
  getEmbedding,
  initializeModel
};
