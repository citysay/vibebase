import express from 'express';
import cors from 'cors';
import { createReadStream, existsSync, statSync, readdirSync, appendFileSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { randomUUID } from 'crypto';

const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json());

// Types
interface MemoryNode {
  id: string;
  content: string;
  embedding?: number[];
  content_type: string;
  parent_id?: string;
  children: string[];
  depth: number;
  metadata: Record<string, unknown>;
  tags: string[];
  created_at: number;
  last_accessed_at: number;
  access_count: number;
  importance: number;
  decay_rate: number;
  entity_ids: string[];
  relation_ids: string[];
}

interface Entity {
  id: string;
  name: string;
  entity_type: string;
  properties: Record<string, unknown>;
  memory_refs: string[];
  created_at: number;
  updated_at: number;
}

interface Relation {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  weight: number;
  bidirectional: boolean;
  metadata: Record<string, unknown>;
  created_at: number;
}

interface DatabaseInfo {
  path: string;
  name: string;
  memoryCount: number;
  entityCount: number;
  relationCount: number;
  hasHnswIndex: boolean;
  lastModified: number;
}

// Helper: Read JSONL file
async function readJsonlFile<T>(filePath: string): Promise<T[]> {
  if (!existsSync(filePath)) {
    return [];
  }

  const results: T[] = [];
  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) {
      try {
        results.push(JSON.parse(trimmed) as T);
      } catch (e) {
        console.warn('Failed to parse line:', trimmed);
      }
    }
  }

  return results;
}

// Helper: Check if path is valid AIDB
function isValidAidb(dbPath: string): boolean {
  if (!existsSync(dbPath) || !statSync(dbPath).isDirectory()) {
    return false;
  }
  // Check for at least one of the expected files
  const hasDocuments = existsSync(path.join(dbPath, 'documents.jsonl'));
  const hasHnsw = existsSync(path.join(dbPath, 'hnsw.index'));
  const hasGraph = existsSync(path.join(dbPath, 'graph'));
  return hasDocuments || hasHnsw || hasGraph;
}

// Helper: Get database info
async function getDatabaseInfo(dbPath: string): Promise<DatabaseInfo | null> {
  if (!isValidAidb(dbPath)) {
    return null;
  }

  const documentsPath = path.join(dbPath, 'documents.jsonl');
  const entitiesPath = path.join(dbPath, 'graph', 'entities.jsonl');
  const relationsPath = path.join(dbPath, 'graph', 'relations.jsonl');
  const hnswPath = path.join(dbPath, 'hnsw.index');

  let memoryCount = 0;
  let entityCount = 0;
  let relationCount = 0;
  let lastModified = 0;

  if (existsSync(documentsPath)) {
    const docs = await readJsonlFile<MemoryNode>(documentsPath);
    memoryCount = docs.length;
    const stat = statSync(documentsPath);
    lastModified = Math.max(lastModified, stat.mtimeMs);
  }

  if (existsSync(entitiesPath)) {
    const entities = await readJsonlFile<Entity>(entitiesPath);
    entityCount = entities.length;
  }

  if (existsSync(relationsPath)) {
    const relations = await readJsonlFile<Relation>(relationsPath);
    relationCount = relations.length;
  }

  return {
    path: dbPath,
    name: path.basename(dbPath),
    memoryCount,
    entityCount,
    relationCount,
    hasHnswIndex: existsSync(hnswPath),
    lastModified,
  };
}

// API Routes

// Check if a path is a valid AIDB database
app.post('/api/validate', async (req, res) => {
  const { path: dbPath } = req.body;
  if (!dbPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const info = await getDatabaseInfo(dbPath);
  if (info) {
    res.json({ valid: true, info });
  } else {
    res.json({ valid: false, error: 'Not a valid AIDB database' });
  }
});

// Get database stats
app.get('/api/stats', async (req, res) => {
  const dbPath = req.query.path as string;
  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const info = await getDatabaseInfo(dbPath);
  res.json(info);
});

// Get all memories
app.get('/api/memories', async (req, res) => {
  const dbPath = req.query.path as string;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const search = (req.query.search as string) || '';
  const tag = req.query.tag as string;
  const contentType = req.query.contentType as string;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const documentsPath = path.join(dbPath, 'documents.jsonl');
  let memories = await readJsonlFile<MemoryNode>(documentsPath);

  // Filter
  if (search) {
    const lowerSearch = search.toLowerCase();
    memories = memories.filter(m => 
      m.content.toLowerCase().includes(lowerSearch) ||
      m.id.toLowerCase().includes(lowerSearch)
    );
  }

  if (tag) {
    memories = memories.filter(m => m.tags.includes(tag));
  }

  if (contentType) {
    memories = memories.filter(m => m.content_type === contentType);
  }

  const total = memories.length;

  // Paginate
  memories = memories.slice(offset, offset + limit);

  // Remove embedding from response (too large)
  const cleanMemories = memories.map(m => ({
    ...m,
    embedding: m.embedding ? `[${m.embedding.length} dims]` : null,
    embeddingDimension: m.embedding?.length || 0,
  }));

  res.json({ memories: cleanMemories, total, offset, limit });
});

// Get single memory by ID
app.get('/api/memories/:id', async (req, res) => {
  const dbPath = req.query.path as string;
  const { id } = req.params;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const documentsPath = path.join(dbPath, 'documents.jsonl');
  const memories = await readJsonlFile<MemoryNode>(documentsPath);
  const memory = memories.find(m => m.id === id);

  if (!memory) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  res.json({
    ...memory,
    embeddingDimension: memory.embedding?.length || 0,
    embeddingPreview: memory.embedding?.slice(0, 10),
  });
});

// Get all entities
app.get('/api/entities', async (req, res) => {
  const dbPath = req.query.path as string;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const entityType = req.query.entityType as string;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const entitiesPath = path.join(dbPath, 'graph', 'entities.jsonl');
  let entities = await readJsonlFile<Entity>(entitiesPath);

  if (entityType) {
    entities = entities.filter(e => e.entity_type === entityType);
  }

  const total = entities.length;
  entities = entities.slice(offset, offset + limit);

  res.json({ entities, total, offset, limit });
});

// Get all relations
app.get('/api/relations', async (req, res) => {
  const dbPath = req.query.path as string;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const relationType = req.query.relationType as string;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const relationsPath = path.join(dbPath, 'graph', 'relations.jsonl');
  let relations = await readJsonlFile<Relation>(relationsPath);

  if (relationType) {
    relations = relations.filter(r => r.relation_type === relationType);
  }

  const total = relations.length;
  relations = relations.slice(offset, offset + limit);

  res.json({ relations, total, offset, limit });
});

// Get graph data for visualization
app.get('/api/graph', async (req, res) => {
  const dbPath = req.query.path as string;
  const maxNodes = parseInt(req.query.maxNodes as string) || 100;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const entitiesPath = path.join(dbPath, 'graph', 'entities.jsonl');
  const relationsPath = path.join(dbPath, 'graph', 'relations.jsonl');

  const entities = await readJsonlFile<Entity>(entitiesPath);
  const relations = await readJsonlFile<Relation>(relationsPath);

  // Limit nodes for performance
  const limitedEntities = entities.slice(0, maxNodes);
  const entityIds = new Set(limitedEntities.map(e => e.id));

  // Only include relations between visible entities
  const limitedRelations = relations.filter(
    r => entityIds.has(r.source) && entityIds.has(r.target)
  );

  // Format for vis-network
  const nodes = limitedEntities.map(e => ({
    id: e.id,
    label: e.name,
    group: e.entity_type,
    title: `${e.name} (${e.entity_type})`,
  }));

  const edges = limitedRelations.map(r => ({
    id: r.id,
    from: r.source,
    to: r.target,
    label: r.relation_type,
    arrows: r.bidirectional ? 'to;from' : 'to',
  }));

  res.json({ nodes, edges, totalEntities: entities.length, totalRelations: relations.length });
});

// Get all unique tags
app.get('/api/tags', async (req, res) => {
  const dbPath = req.query.path as string;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const documentsPath = path.join(dbPath, 'documents.jsonl');
  const memories = await readJsonlFile<MemoryNode>(documentsPath);

  const tagCounts: Record<string, number> = {};
  for (const m of memories) {
    for (const tag of m.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ tags });
});

// Get content type distribution
app.get('/api/content-types', async (req, res) => {
  const dbPath = req.query.path as string;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const documentsPath = path.join(dbPath, 'documents.jsonl');
  const memories = await readJsonlFile<MemoryNode>(documentsPath);

  const typeCounts: Record<string, number> = {};
  for (const m of memories) {
    typeCounts[m.content_type] = (typeCounts[m.content_type] || 0) + 1;
  }

  const types = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ types });
});

// Get entity type distribution
app.get('/api/entity-types', async (req, res) => {
  const dbPath = req.query.path as string;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const entitiesPath = path.join(dbPath, 'graph', 'entities.jsonl');
  const entities = await readJsonlFile<Entity>(entitiesPath);

  const typeCounts: Record<string, number> = {};
  for (const e of entities) {
    typeCounts[e.entity_type] = (typeCounts[e.entity_type] || 0) + 1;
  }

  const types = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ types });
});

// Get importance distribution
app.get('/api/importance-distribution', async (req, res) => {
  const dbPath = req.query.path as string;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const documentsPath = path.join(dbPath, 'documents.jsonl');
  const memories = await readJsonlFile<MemoryNode>(documentsPath);

  // Create buckets: 0-0.1, 0.1-0.2, ..., 0.9-1.0
  const buckets = Array(10).fill(0);
  for (const m of memories) {
    const bucketIndex = Math.min(9, Math.floor(m.importance * 10));
    buckets[bucketIndex]++;
  }

  const distribution = buckets.map((count, i) => ({
    range: `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`,
    count,
  }));

  res.json({ distribution });
});

// List all databases in a directory (including subdirectories)
app.get('/api/databases', async (req, res) => {
  const parentPath = req.query.path as string;
  
  if (!parentPath || !existsSync(parentPath)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const databases: DatabaseInfo[] = [];

  // Check if the parent path itself is a valid database
  const parentInfo = await getDatabaseInfo(parentPath);
  if (parentInfo) {
    databases.push(parentInfo);
  }

  // Scan subdirectories
  try {
    const entries = readdirSync(parentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(parentPath, entry.name);
        const subInfo = await getDatabaseInfo(subPath);
        if (subInfo) {
          databases.push(subInfo);
        }
      }
    }
  } catch (e) {
    console.error('Failed to scan directory:', e);
  }

  res.json({ databases });
});

// ============================================================================
// News System APIs (with Foreign Key / Populate support)
// ============================================================================

// Helper: Parse documents by collection
function parseDocumentsByCollection(documents: MemoryNode[]): {
  categories: MemoryNode[];
  users: MemoryNode[];
  news: MemoryNode[];
  comments: MemoryNode[];
} {
  const categories: MemoryNode[] = [];
  const users: MemoryNode[] = [];
  const news: MemoryNode[] = [];
  const comments: MemoryNode[] = [];

  for (const doc of documents) {
    const collection = doc.metadata?._collection as string;
    if (collection === 'categories' || doc.content_type === 'category') {
      categories.push(doc);
    } else if (collection === 'users' || doc.content_type === 'user') {
      users.push(doc);
    } else if (collection === 'news' || doc.content_type === 'news') {
      news.push(doc);
    } else if (collection === 'comments' || doc.content_type === 'comment') {
      comments.push(doc);
    }
  }

  return { categories, users, news, comments };
}

// Helper: Populate foreign keys for news articles
function populateNewsArticle(
  article: MemoryNode,
  categories: MemoryNode[],
  users: MemoryNode[]
): Record<string, unknown> {
  const categoryId = article.metadata?.categoryId as string;
  const authorId = article.metadata?.authorId as string;

  const category = categories.find(c => c.id === categoryId);
  const author = users.find(u => u.id === authorId);

  return {
    id: article.id,
    content: article.content,
    title: article.metadata?.title || '',
    categoryId,
    authorId,
    status: article.metadata?.status || 'draft',
    publishedAt: article.metadata?.publishedAt || article.created_at,
    viewCount: article.metadata?.viewCount || 0,
    likeCount: article.metadata?.likeCount || 0,
    tags: article.tags,
    created_at: article.created_at,
    importance: article.importance,
    // Populated foreign keys
    category: category ? {
      id: category.id,
      name: category.metadata?.name || '',
      description: category.metadata?.description || '',
      icon: category.metadata?.icon || '',
      slug: category.metadata?.slug || '',
    } : null,
    author: author ? {
      id: author.id,
      name: author.metadata?.name || '',
      email: author.metadata?.email || '',
      avatar: author.metadata?.avatar || '',
      role: author.metadata?.role || 'guest',
    } : null,
  };
}

// Helper: Populate foreign keys for comments
function populateComment(
  comment: MemoryNode,
  users: MemoryNode[]
): Record<string, unknown> {
  const authorId = comment.metadata?.authorId as string;
  const author = users.find(u => u.id === authorId);

  return {
    id: comment.id,
    content: comment.content,
    newsId: comment.metadata?.newsId || '',
    authorId,
    parentId: comment.metadata?.parentId || null,
    likeCount: comment.metadata?.likeCount || 0,
    created_at: comment.created_at,
    depth: comment.depth,
    children: comment.children,
    // Populated foreign keys
    author: author ? {
      id: author.id,
      name: author.metadata?.name || '',
      email: author.metadata?.email || '',
      avatar: author.metadata?.avatar || '',
      role: author.metadata?.role || 'guest',
    } : null,
  };
}

// NOTE: Old API routes using parseDocumentsByCollection have been removed.
// All News System API routes below use getDocumentsByCollection which supports
// reading from subdirectories (e.g., categories/documents.jsonl)

// ============================================================================
// News System APIs (with Foreign Key support)
// ============================================================================

// Helper: Get documents by collection type
// Supports both:
// 1. Collection stored in main documents.jsonl with _collection metadata
// 2. Collection stored in subdirectory: {dbPath}/{collection}/documents.jsonl
async function getDocumentsByCollection(dbPath: string, collection: string): Promise<MemoryNode[]> {
  const results: MemoryNode[] = [];
  
  // First, check if there's a subdirectory for this collection
  const collectionDir = path.join(dbPath, collection);
  const collectionDocPath = path.join(collectionDir, 'documents.jsonl');
  
  if (existsSync(collectionDocPath)) {
    // Read from collection subdirectory
    const collectionDocs = await readJsonlFile<MemoryNode>(collectionDocPath);
    results.push(...collectionDocs);
  }
  
  // Also read from main documents.jsonl (for backward compatibility)
  const mainDocPath = path.join(dbPath, 'documents.jsonl');
  if (existsSync(mainDocPath)) {
    const allDocs = await readJsonlFile<MemoryNode>(mainDocPath);
    const filteredDocs = allDocs.filter(doc => doc.metadata?._collection === collection);
    // Avoid duplicates by checking IDs
    const existingIds = new Set(results.map(d => d.id));
    for (const doc of filteredDocs) {
      if (!existingIds.has(doc.id)) {
        results.push(doc);
      }
    }
  }
  
  return results;
}

// Helper: Create lookup map
function createLookupMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}

// Get news categories
app.get('/api/news/categories', async (req, res) => {
  const dbPath = req.query.path as string;
  
  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const docs = await getDocumentsByCollection(dbPath, 'categories');
  const categories = docs.map(doc => ({
    id: doc.id,
    name: doc.metadata?.name as string || '',
    description: doc.metadata?.description as string || '',
    icon: doc.metadata?.icon as string || '',
    slug: doc.metadata?.slug as string || '',
  }));

  res.json({ categories });
});

// Get news users
app.get('/api/news/users', async (req, res) => {
  const dbPath = req.query.path as string;
  
  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const docs = await getDocumentsByCollection(dbPath, 'users');
  const users = docs.map(doc => ({
    id: doc.id,
    name: doc.metadata?.name as string || '',
    email: doc.metadata?.email as string || '',
    avatar: doc.metadata?.avatar as string || '',
    role: doc.metadata?.role as string || '',
  }));

  res.json({ users });
});

// Get news articles with populated foreign keys
app.get('/api/news/articles', async (req, res) => {
  const dbPath = req.query.path as string;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const categoryId = req.query.categoryId as string;
  const authorId = req.query.authorId as string;
  const status = req.query.status as string;
  const search = req.query.search as string;
  
  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  // Get all relevant collections
  const [newsDocs, categoryDocs, userDocs] = await Promise.all([
    getDocumentsByCollection(dbPath, 'news'),
    getDocumentsByCollection(dbPath, 'categories'),
    getDocumentsByCollection(dbPath, 'users'),
  ]);

  // Create lookup maps for foreign key resolution
  const categoryMap = createLookupMap(categoryDocs);
  const userMap = createLookupMap(userDocs);

  // Filter articles
  let articles = newsDocs;
  
  if (categoryId) {
    articles = articles.filter(a => a.metadata?.categoryId === categoryId);
  }
  if (authorId) {
    articles = articles.filter(a => a.metadata?.authorId === authorId);
  }
  if (status) {
    articles = articles.filter(a => a.metadata?.status === status);
  }
  if (search) {
    const lowerSearch = search.toLowerCase();
    articles = articles.filter(a => 
      a.content.toLowerCase().includes(lowerSearch) ||
      (a.metadata?.title as string || '').toLowerCase().includes(lowerSearch)
    );
  }

  // Sort by publishedAt descending
  articles.sort((a, b) => 
    ((b.metadata?.publishedAt as number) || 0) - ((a.metadata?.publishedAt as number) || 0)
  );

  const total = articles.length;
  articles = articles.slice(offset, offset + limit);

  // Populate foreign keys
  const populatedArticles = articles.map(doc => {
    const catId = doc.metadata?.categoryId as string;
    const authId = doc.metadata?.authorId as string;
    const categoryDoc = catId ? categoryMap.get(catId) : null;
    const authorDoc = authId ? userMap.get(authId) : null;

    return {
      id: doc.id,
      content: doc.content,
      title: doc.metadata?.title as string || '',
      categoryId: catId,
      authorId: authId,
      status: doc.metadata?.status as string || 'draft',
      publishedAt: doc.metadata?.publishedAt as number || doc.created_at,
      viewCount: doc.metadata?.viewCount as number || 0,
      likeCount: doc.metadata?.likeCount as number || 0,
      tags: doc.tags,
      created_at: doc.created_at,
      // Populated foreign key data
      category: categoryDoc ? {
        id: categoryDoc.id,
        name: categoryDoc.metadata?.name as string || '',
        description: categoryDoc.metadata?.description as string || '',
        icon: categoryDoc.metadata?.icon as string || '',
        slug: categoryDoc.metadata?.slug as string || '',
      } : null,
      author: authorDoc ? {
        id: authorDoc.id,
        name: authorDoc.metadata?.name as string || '',
        email: authorDoc.metadata?.email as string || '',
        avatar: authorDoc.metadata?.avatar as string || '',
        role: authorDoc.metadata?.role as string || '',
      } : null,
    };
  });

  res.json({ articles: populatedArticles, total });
});

// Get single news article
app.get('/api/news/articles/:id', async (req, res) => {
  const dbPath = req.query.path as string;
  const { id } = req.params;
  
  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const [newsDocs, categoryDocs, userDocs] = await Promise.all([
    getDocumentsByCollection(dbPath, 'news'),
    getDocumentsByCollection(dbPath, 'categories'),
    getDocumentsByCollection(dbPath, 'users'),
  ]);

  const doc = newsDocs.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const categoryMap = createLookupMap(categoryDocs);
  const userMap = createLookupMap(userDocs);

  const catId = doc.metadata?.categoryId as string;
  const authId = doc.metadata?.authorId as string;
  const categoryDoc = catId ? categoryMap.get(catId) : null;
  const authorDoc = authId ? userMap.get(authId) : null;

  res.json({
    id: doc.id,
    content: doc.content,
    title: doc.metadata?.title as string || '',
    categoryId: catId,
    authorId: authId,
    status: doc.metadata?.status as string || 'draft',
    publishedAt: doc.metadata?.publishedAt as number || doc.created_at,
    viewCount: doc.metadata?.viewCount as number || 0,
    likeCount: doc.metadata?.likeCount as number || 0,
    tags: doc.tags,
    created_at: doc.created_at,
    category: categoryDoc ? {
      id: categoryDoc.id,
      name: categoryDoc.metadata?.name as string || '',
      description: categoryDoc.metadata?.description as string || '',
      icon: categoryDoc.metadata?.icon as string || '',
      slug: categoryDoc.metadata?.slug as string || '',
    } : null,
    author: authorDoc ? {
      id: authorDoc.id,
      name: authorDoc.metadata?.name as string || '',
      email: authorDoc.metadata?.email as string || '',
      avatar: authorDoc.metadata?.avatar as string || '',
      role: authorDoc.metadata?.role as string || '',
    } : null,
  });
});

// Get comments for a news article with populated foreign keys
app.get('/api/news/comments', async (req, res) => {
  const dbPath = req.query.path as string;
  const newsId = req.query.newsId as string;
  
  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const [commentDocs, userDocs] = await Promise.all([
    getDocumentsByCollection(dbPath, 'comments'),
    getDocumentsByCollection(dbPath, 'users'),
  ]);

  const userMap = createLookupMap(userDocs);

  // Filter comments for this news article
  let comments = commentDocs.filter(c => c.metadata?.newsId === newsId);

  // Sort by created_at ascending
  comments.sort((a, b) => a.created_at - b.created_at);

  // Populate foreign keys and build comment tree
  const populatedComments = comments.map(doc => {
    const authId = doc.metadata?.authorId as string;
    const authorDoc = authId ? userMap.get(authId) : null;

    return {
      id: doc.id,
      content: doc.content,
      newsId: doc.metadata?.newsId as string || '',
      authorId: authId,
      parentId: doc.metadata?.parentId as string || null,
      likeCount: doc.metadata?.likeCount as number || 0,
      created_at: doc.created_at,
      depth: doc.depth,
      children: doc.children,
      author: authorDoc ? {
        id: authorDoc.id,
        name: authorDoc.metadata?.name as string || '',
        email: authorDoc.metadata?.email as string || '',
        avatar: authorDoc.metadata?.avatar as string || '',
        role: authorDoc.metadata?.role as string || '',
      } : null,
    };
  });

  res.json({ comments: populatedComments });
});

// Get news system stats
app.get('/api/news/stats', async (req, res) => {
  const dbPath = req.query.path as string;
  
  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  const [categoryDocs, userDocs, newsDocs, commentDocs] = await Promise.all([
    getDocumentsByCollection(dbPath, 'categories'),
    getDocumentsByCollection(dbPath, 'users'),
    getDocumentsByCollection(dbPath, 'news'),
    getDocumentsByCollection(dbPath, 'comments'),
  ]);

  const publishedCount = newsDocs.filter(n => n.metadata?.status === 'published').length;
  const draftCount = newsDocs.filter(n => n.metadata?.status === 'draft').length;

  res.json({
    categoryCount: categoryDocs.length,
    userCount: userDocs.length,
    articleCount: newsDocs.length,
    commentCount: commentDocs.length,
    publishedCount,
    draftCount,
  });
});

// Create a new news article
app.post('/api/news/articles', async (req, res) => {
  const { path: dbPath, title, content, categoryId, authorId, status = 'draft', tags = [] } = req.body;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  if (!categoryId || !authorId) {
    return res.status(400).json({ error: 'categoryId and authorId are required (foreign keys)' });
  }

  // Validate foreign keys exist
  const [categories, users] = await Promise.all([
    getDocumentsByCollection(dbPath, 'categories'),
    getDocumentsByCollection(dbPath, 'users'),
  ]);

  const categoryExists = categories.some(c => c.id === categoryId);
  const authorExists = users.some(u => u.id === authorId);

  if (!categoryExists) {
    return res.status(400).json({ 
      error: `Foreign key constraint violation: categoryId '${categoryId}' not found in categories` 
    });
  }

  if (!authorExists) {
    return res.status(400).json({ 
      error: `Foreign key constraint violation: authorId '${authorId}' not found in users` 
    });
  }

  // Create the new article
  const now = Date.now();
  const articleId = `news_${randomUUID().split('-')[0]}`;
  
  const newArticle: MemoryNode = {
    id: articleId,
    content: `${title}\n\n${content}`,
    content_type: 'news',
    parent_id: undefined,
    children: [],
    depth: 0,
    metadata: {
      title,
      categoryId,
      authorId,
      status,
      publishedAt: status === 'published' ? now : undefined,
      viewCount: 0,
      likeCount: 0,
      _collection: 'news',
      _foreignKeys: {
        categoryId: { targetCollection: 'categories', onDelete: 'restrict' },
        authorId: { targetCollection: 'users', onDelete: 'set_null' },
      },
    },
    tags: ['news', ...tags],
    created_at: now,
    last_accessed_at: now,
    access_count: 0,
    importance: status === 'published' ? 0.8 : 0.5,
    decay_rate: 0.01,
    entity_ids: [],
    relation_ids: [],
  };

  // Append to documents.jsonl
  const documentsPath = path.join(dbPath, 'documents.jsonl');
  try {
    appendFileSync(documentsPath, JSON.stringify(newArticle) + '\n');
    
    // Return populated article
    const category = categories.find(c => c.id === categoryId);
    const author = users.find(u => u.id === authorId);

    res.status(201).json({
      id: newArticle.id,
      content: content,
      title,
      categoryId,
      authorId,
      status,
      publishedAt: newArticle.metadata.publishedAt,
      viewCount: 0,
      likeCount: 0,
      tags: newArticle.tags,
      created_at: now,
      category: category ? {
        id: category.id,
        name: category.metadata?.name || '',
        icon: category.metadata?.icon || '',
      } : null,
      author: author ? {
        id: author.id,
        name: author.metadata?.name || '',
        avatar: author.metadata?.avatar || '',
        role: author.metadata?.role || '',
      } : null,
    });
  } catch (error) {
    console.error('Failed to create article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Create a new comment
app.post('/api/news/comments', async (req, res) => {
  const { path: dbPath, newsId, authorId, content, parentId = null } = req.body;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (!newsId || !authorId) {
    return res.status(400).json({ error: 'newsId and authorId are required (foreign keys)' });
  }

  // Validate foreign keys exist
  const [newsDocs, users, comments] = await Promise.all([
    getDocumentsByCollection(dbPath, 'news'),
    getDocumentsByCollection(dbPath, 'users'),
    getDocumentsByCollection(dbPath, 'comments'),
  ]);

  const newsExists = newsDocs.some(n => n.id === newsId);
  const authorExists = users.some(u => u.id === authorId);
  const parentExists = parentId ? comments.some(c => c.id === parentId) : true;

  if (!newsExists) {
    return res.status(400).json({ 
      error: `Foreign key constraint violation: newsId '${newsId}' not found in news` 
    });
  }

  if (!authorExists) {
    return res.status(400).json({ 
      error: `Foreign key constraint violation: authorId '${authorId}' not found in users` 
    });
  }

  if (!parentExists) {
    return res.status(400).json({ 
      error: `Foreign key constraint violation: parentId '${parentId}' not found in comments` 
    });
  }

  // Create the new comment
  const now = Date.now();
  const commentId = `comment_${randomUUID().split('-')[0]}`;
  
  const newComment: MemoryNode = {
    id: commentId,
    content,
    content_type: 'comment',
    parent_id: parentId || undefined,
    children: [],
    depth: parentId ? 1 : 0,
    metadata: {
      newsId,
      authorId,
      parentId,
      likeCount: 0,
      _collection: 'comments',
      _foreignKeys: {
        newsId: { targetCollection: 'news', onDelete: 'cascade' },
        authorId: { targetCollection: 'users', onDelete: 'set_null' },
        parentId: { targetCollection: 'comments', onDelete: 'cascade' },
      },
    },
    tags: parentId ? ['comment', 'reply'] : ['comment'],
    created_at: now,
    last_accessed_at: now,
    access_count: 0,
    importance: 0.5,
    decay_rate: 0.01,
    entity_ids: [],
    relation_ids: [],
  };

  // Append to documents.jsonl
  const documentsPath = path.join(dbPath, 'documents.jsonl');
  try {
    appendFileSync(documentsPath, JSON.stringify(newComment) + '\n');
    
    // Return populated comment
    const author = users.find(u => u.id === authorId);

    res.status(201).json({
      id: newComment.id,
      content,
      newsId,
      authorId,
      parentId,
      likeCount: 0,
      created_at: now,
      depth: newComment.depth,
      author: author ? {
        id: author.id,
        name: author.metadata?.name || '',
        avatar: author.metadata?.avatar || '',
        role: author.metadata?.role || '',
      } : null,
    });
  } catch (error) {
    console.error('Failed to create comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// ============================================================================
// Category Management APIs
// ============================================================================

// Helper: Read JSONL file from collection subdirectory
async function readCollectionFile(dbPath: string, collection: string): Promise<MemoryNode[]> {
  const collectionDocPath = path.join(dbPath, collection, 'documents.jsonl');
  if (existsSync(collectionDocPath)) {
    return readJsonlFile<MemoryNode>(collectionDocPath);
  }
  return [];
}

// Helper: Write JSONL file to collection subdirectory
function writeCollectionFile(dbPath: string, collection: string, documents: MemoryNode[]): void {
  const collectionDir = path.join(dbPath, collection);
  const collectionDocPath = path.join(collectionDir, 'documents.jsonl');
  
  // Ensure directory exists
  if (!existsSync(collectionDir)) {
    require('fs').mkdirSync(collectionDir, { recursive: true });
  }
  
  // Write all documents
  const content = documents.map(doc => JSON.stringify(doc)).join('\n') + '\n';
  require('fs').writeFileSync(collectionDocPath, content, 'utf-8');
}

// Create a new category
app.post('/api/news/categories', async (req, res) => {
  const { path: dbPath, name, description, icon, slug } = req.body;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  if (!name || !description || !icon) {
    return res.status(400).json({ error: 'Name, description and icon are required' });
  }

  // Generate slug if not provided
  const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');
  const categoryId = `cat_${categorySlug}`;

  // Check if category ID already exists
  const existingCategories = await readCollectionFile(dbPath, 'categories');
  if (existingCategories.some(c => c.id === categoryId)) {
    return res.status(400).json({ error: `Category with ID '${categoryId}' already exists` });
  }

  // Create the new category
  const now = Date.now();
  const newCategory: MemoryNode = {
    id: categoryId,
    content: `${name} - ${description}`,
    content_type: 'category',
    parent_id: undefined,
    children: [],
    depth: 0,
    metadata: {
      name,
      description,
      icon,
      slug: categorySlug,
      _collection: 'categories',
    },
    tags: ['category'],
    created_at: now,
    last_accessed_at: now,
    access_count: 0,
    importance: 0.9,
    decay_rate: 0.01,
    entity_ids: [],
    relation_ids: [],
  };

  try {
    // Read existing categories and add new one
    const categories = await readCollectionFile(dbPath, 'categories');
    categories.push(newCategory);
    writeCollectionFile(dbPath, 'categories', categories);

    res.status(201).json({
      success: true,
      category: {
        id: newCategory.id,
        name,
        description,
        icon,
        slug: categorySlug,
      },
    });
  } catch (error) {
    console.error('Failed to create category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category
app.put('/api/news/categories/:id', async (req, res) => {
  const { path: dbPath, name, description, icon, slug } = req.body;
  const { id } = req.params;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  try {
    const categories = await readCollectionFile(dbPath, 'categories');
    const categoryIndex = categories.findIndex(c => c.id === id);

    if (categoryIndex === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Update the category
    const category = categories[categoryIndex];
    if (name) category.metadata.name = name;
    if (description) category.metadata.description = description;
    if (icon) category.metadata.icon = icon;
    if (slug) category.metadata.slug = slug;
    category.content = `${category.metadata.name} - ${category.metadata.description}`;
    category.last_accessed_at = Date.now();

    // Write back
    writeCollectionFile(dbPath, 'categories', categories);

    res.json({
      success: true,
      category: {
        id: category.id,
        name: category.metadata.name,
        description: category.metadata.description,
        icon: category.metadata.icon,
        slug: category.metadata.slug,
      },
    });
  } catch (error) {
    console.error('Failed to update category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
app.delete('/api/news/categories/:id', async (req, res) => {
  const dbPath = req.query.path as string;
  const { id } = req.params;

  if (!dbPath || !isValidAidb(dbPath)) {
    return res.status(400).json({ error: 'Invalid database path' });
  }

  try {
    // Check if any news articles reference this category
    const newsDocs = await getDocumentsByCollection(dbPath, 'news');
    const hasReferences = newsDocs.some(n => n.metadata?.categoryId === id);

    if (hasReferences) {
      return res.status(400).json({ 
        error: `Cannot delete category '${id}': it is referenced by news articles (restrict constraint)` 
      });
    }

    // Read categories and remove the one to delete
    const categories = await readCollectionFile(dbPath, 'categories');
    const filteredCategories = categories.filter(c => c.id !== id);

    if (filteredCategories.length === categories.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Write back
    writeCollectionFile(dbPath, 'categories', filteredCategories);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 AIDB Viewer Server running at http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});
