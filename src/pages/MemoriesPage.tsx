import { useEffect, useState, useCallback } from 'react';
import { Brain, Tag, Star } from 'lucide-react';
import DataTable from '../components/DataTable';
import MemoryDetail from '../components/MemoryDetail';
import { getMemories } from '../utils/api';
import type { MemoryNode } from '../types';

interface MemoriesPageProps {
  dbPath: string;
}

export default function MemoriesPage({ dbPath }: MemoriesPageProps) {
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<MemoryNode | null>(null);
  const pageSize = 20;

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMemories(dbPath, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: searchQuery,
      });
      setMemories(data.memories);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  }, [dbPath, page, searchQuery]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const contentTypeLabels: Record<string, string> = {
    text: '文本',
    image: '图片',
    code: '代码',
    conversation: '对话',
    document: '文档',
    other: '其他',
  };

  const columns = [
    {
      key: 'content',
      header: '内容',
      width: '40%',
      render: (item: MemoryNode) => (
        <div className="max-w-md">
          <p className="text-gray-900 truncate">{truncateContent(item.content)}</p>
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Tag className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">
                {item.tags.slice(0, 3).join(', ')}
                {item.tags.length > 3 && ` +${item.tags.length - 3}`}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'content_type',
      header: '类型',
      width: '10%',
      render: (item: MemoryNode) => (
        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
          {contentTypeLabels[item.content_type] || item.content_type}
        </span>
      ),
    },
    {
      key: 'importance',
      header: '重要性',
      width: '10%',
      render: (item: MemoryNode) => (
        <div className="flex items-center gap-1">
          <Star className={`w-4 h-4 ${item.importance >= 0.7 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
          <span>{(item.importance * 100).toFixed(0)}%</span>
        </div>
      ),
    },
    {
      key: 'embeddingDimension',
      header: '向量维度',
      width: '10%',
      render: (item: MemoryNode) => (
        <span className="text-gray-500">
          {item.embeddingDimension || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      width: '15%',
      render: (item: MemoryNode) => (
        <span className="text-gray-500">{formatDate(item.created_at)}</span>
      ),
    },
    {
      key: 'access_count',
      header: '访问次数',
      width: '10%',
      render: (item: MemoryNode) => (
        <span className="text-gray-500">{item.access_count}</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary-500" />
            记忆列表
          </h1>
          <p className="text-gray-500 mt-1">共 {total} 条记忆</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={memories}
        columns={columns}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="搜索内容或ID..."
        onRowClick={setSelectedMemory}
        loading={loading}
      />

      {/* Detail Modal */}
      {selectedMemory && (
        <MemoryDetail
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
        />
      )}
    </div>
  );
}
