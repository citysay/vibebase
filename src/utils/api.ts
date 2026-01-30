import type {
  DatabaseInfo,
  MemoryNode,
  MemoriesResponse,
  EntitiesResponse,
  RelationsResponse,
  GraphData,
  TagCount,
  TypeCount,
  ImportanceDistribution,
  NewsCategory,
  NewsUser,
  NewsArticle,
  NewsComment,
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

// Validate database path
export async function validateDatabase(path: string): Promise<{ valid: boolean; info?: DatabaseInfo; error?: string }> {
  return fetchJson(`${API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

// Get database stats
export async function getDatabaseStats(path: string): Promise<DatabaseInfo> {
  return fetchJson(`${API_BASE}/stats?path=${encodeURIComponent(path)}`);
}

// Get memories
export async function getMemories(
  path: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    tag?: string;
    contentType?: string;
  } = {}
): Promise<MemoriesResponse> {
  const params = new URLSearchParams({ path });
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.search) params.set('search', options.search);
  if (options.tag) params.set('tag', options.tag);
  if (options.contentType) params.set('contentType', options.contentType);
  
  return fetchJson(`${API_BASE}/memories?${params}`);
}

// Get single memory
export async function getMemory(path: string, id: string): Promise<MemoryNode> {
  return fetchJson(`${API_BASE}/memories/${encodeURIComponent(id)}?path=${encodeURIComponent(path)}`);
}

// Get entities
export async function getEntities(
  path: string,
  options: {
    limit?: number;
    offset?: number;
    entityType?: string;
  } = {}
): Promise<EntitiesResponse> {
  const params = new URLSearchParams({ path });
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.entityType) params.set('entityType', options.entityType);
  
  return fetchJson(`${API_BASE}/entities?${params}`);
}

// Get relations
export async function getRelations(
  path: string,
  options: {
    limit?: number;
    offset?: number;
    relationType?: string;
  } = {}
): Promise<RelationsResponse> {
  const params = new URLSearchParams({ path });
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.relationType) params.set('relationType', options.relationType);
  
  return fetchJson(`${API_BASE}/relations?${params}`);
}

// Get graph data
export async function getGraphData(path: string, maxNodes = 100): Promise<GraphData> {
  return fetchJson(`${API_BASE}/graph?path=${encodeURIComponent(path)}&maxNodes=${maxNodes}`);
}

// Get tags
export async function getTags(path: string): Promise<{ tags: TagCount[] }> {
  return fetchJson(`${API_BASE}/tags?path=${encodeURIComponent(path)}`);
}

// Get content types
export async function getContentTypes(path: string): Promise<{ types: TypeCount[] }> {
  return fetchJson(`${API_BASE}/content-types?path=${encodeURIComponent(path)}`);
}

// Get entity types
export async function getEntityTypes(path: string): Promise<{ types: TypeCount[] }> {
  return fetchJson(`${API_BASE}/entity-types?path=${encodeURIComponent(path)}`);
}

// Get importance distribution
export async function getImportanceDistribution(path: string): Promise<{ distribution: ImportanceDistribution[] }> {
  return fetchJson(`${API_BASE}/importance-distribution?path=${encodeURIComponent(path)}`);
}

// List all databases in a directory (including subdirectories)
export async function listDatabases(path: string): Promise<{ databases: DatabaseInfo[] }> {
  return fetchJson(`${API_BASE}/databases?path=${encodeURIComponent(path)}`);
}

// ============================================================================
// News System APIs (with Foreign Key support)
// ============================================================================

// Get news categories
export async function getNewsCategories(path: string): Promise<{ categories: NewsCategory[] }> {
  return fetchJson(`${API_BASE}/news/categories?path=${encodeURIComponent(path)}`);
}

// Create a new category
export async function createNewsCategory(
  dbPath: string,
  data: {
    name: string;
    description: string;
    icon: string;
    slug: string;
    code: string; // 分类代码（英文），用于生成 ID
  }
): Promise<{ success: boolean; category: NewsCategory }> {
  return fetchJson(`${API_BASE}/news/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dbPath, ...data }),
  });
}

// Update a category
export async function updateNewsCategory(
  dbPath: string,
  categoryId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    slug?: string;
  }
): Promise<{ success: boolean; category: NewsCategory }> {
  return fetchJson(`${API_BASE}/news/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dbPath, ...data }),
  });
}

// Delete a category
export async function deleteNewsCategory(
  dbPath: string,
  categoryId: string
): Promise<{ success: boolean }> {
  return fetchJson(`${API_BASE}/news/categories/${encodeURIComponent(categoryId)}?path=${encodeURIComponent(dbPath)}`, {
    method: 'DELETE',
  });
}

// Get news users
export async function getNewsUsers(path: string): Promise<{ users: NewsUser[] }> {
  return fetchJson(`${API_BASE}/news/users?path=${encodeURIComponent(path)}`);
}

// Create a new user
export async function createNewsUser(
  dbPath: string,
  data: {
    name: string;
    email: string;
    avatar: string;
    role: 'admin' | 'editor' | 'reader' | 'guest';
  }
): Promise<{ success: boolean; user: NewsUser }> {
  return fetchJson(`${API_BASE}/news/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dbPath, ...data }),
  });
}

// Update a user
export async function updateNewsUser(
  dbPath: string,
  userId: string,
  data: {
    name?: string;
    email?: string;
    avatar?: string;
    role?: 'admin' | 'editor' | 'reader' | 'guest';
  }
): Promise<{ success: boolean; user: NewsUser }> {
  return fetchJson(`${API_BASE}/news/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dbPath, ...data }),
  });
}

// Delete a user
export async function deleteNewsUser(
  dbPath: string,
  userId: string
): Promise<{ success: boolean }> {
  return fetchJson(`${API_BASE}/news/users/${encodeURIComponent(userId)}?path=${encodeURIComponent(dbPath)}`, {
    method: 'DELETE',
  });
}

// Get news articles with populated foreign keys
export async function getNewsArticles(
  path: string,
  options: {
    limit?: number;
    offset?: number;
    categoryId?: string;
    authorId?: string;
    status?: string;
    search?: string;
  } = {}
): Promise<{ articles: NewsArticle[]; total: number }> {
  const params = new URLSearchParams({ path });
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.categoryId) params.set('categoryId', options.categoryId);
  if (options.authorId) params.set('authorId', options.authorId);
  if (options.status) params.set('status', options.status);
  if (options.search) params.set('search', options.search);
  
  return fetchJson(`${API_BASE}/news/articles?${params}`);
}

// Get single news article with populated foreign keys
export async function getNewsArticle(path: string, id: string): Promise<NewsArticle> {
  return fetchJson(`${API_BASE}/news/articles/${encodeURIComponent(id)}?path=${encodeURIComponent(path)}`);
}

// Get comments for a news article with populated foreign keys
export async function getNewsComments(
  path: string,
  newsId: string
): Promise<{ comments: NewsComment[] }> {
  return fetchJson(`${API_BASE}/news/comments?path=${encodeURIComponent(path)}&newsId=${encodeURIComponent(newsId)}`);
}

// Get news system stats
export async function getNewsStats(path: string): Promise<{
  categoryCount: number;
  userCount: number;
  articleCount: number;
  commentCount: number;
  publishedCount: number;
  draftCount: number;
}> {
  return fetchJson(`${API_BASE}/news/stats?path=${encodeURIComponent(path)}`);
}

// Create a new news article
export async function createNewsArticle(
  dbPath: string,
  data: {
    title: string;
    content: string;
    categoryId: string;
    authorId: string;
    status?: 'draft' | 'published';
    tags?: string[];
  }
): Promise<{ success: boolean; article: NewsArticle }> {
  return fetchJson(`${API_BASE}/news/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dbPath, ...data }),
  });
}

// Create a new comment
export async function createNewsComment(
  dbPath: string,
  data: {
    newsId: string;
    authorId: string;
    content: string;
    parentId?: string | null;
  }
): Promise<{ success: boolean; comment: NewsComment }> {
  return fetchJson(`${API_BASE}/news/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dbPath, ...data }),
  });
}
