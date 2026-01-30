// Database types
export interface DatabaseInfo {
  path: string;
  name: string;
  memoryCount: number;
  entityCount: number;
  relationCount: number;
  hasHnswIndex: boolean;
  lastModified: number;
}

export interface MemoryNode {
  id: string;
  content: string;
  embedding?: string | number[];
  embeddingDimension?: number;
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

export interface Entity {
  id: string;
  name: string;
  entity_type: string;
  properties: Record<string, unknown>;
  memory_refs: string[];
  created_at: number;
  updated_at: number;
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  weight: number;
  bidirectional: boolean;
  metadata: Record<string, unknown>;
  created_at: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalEntities: number;
  totalRelations: number;
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  title: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  arrows: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface TypeCount {
  type: string;
  count: number;
}

export interface ImportanceDistribution {
  range: string;
  count: number;
}

// News System types
export interface NewsCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
  articleCount?: number;
}

export interface NewsUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'editor' | 'reader' | 'guest';
}

export interface NewsArticle {
  id: string;
  content: string;
  title: string;
  categoryId: string;
  authorId: string;
  status: 'draft' | 'published';
  publishedAt: number;
  viewCount: number;
  likeCount: number;
  tags: string[];
  created_at: number;
  // Populated fields
  category?: NewsCategory;
  author?: NewsUser;
}

export interface NewsComment {
  id: string;
  content: string;
  newsId: string;
  authorId: string;
  parentId: string | null;
  likeCount: number;
  created_at: number;
  depth: number;
  children: string[];
  // Populated fields
  author?: NewsUser;
  news?: NewsArticle;
  replies?: NewsComment[];
}

export interface ForeignKeyInfo {
  field: string;
  targetCollection: string;
  onDelete: 'cascade' | 'set_null' | 'restrict';
}

// API Response types
export interface PaginatedResponse<T> {
  total: number;
  offset: number;
  limit: number;
  [key: string]: T[] | number;
}

export interface MemoriesResponse extends PaginatedResponse<MemoryNode> {
  memories: MemoryNode[];
}

export interface EntitiesResponse extends PaginatedResponse<Entity> {
  entities: Entity[];
}

export interface RelationsResponse extends PaginatedResponse<Relation> {
  relations: Relation[];
}
