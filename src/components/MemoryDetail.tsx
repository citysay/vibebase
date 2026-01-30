import { X, Tag, Clock, Hash, FileText, Star } from 'lucide-react';
import type { MemoryNode } from '../types';

interface MemoryDetailProps {
  memory: MemoryNode;
  onClose: () => void;
}

export default function MemoryDetail({ memory, onClose }: MemoryDetailProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const contentTypeLabels: Record<string, string> = {
    text: '文本',
    image: '图片',
    code: '代码',
    conversation: '对话',
    document: '文档',
    other: '其他',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">记忆详情</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* ID */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">ID</label>
            <p className="mt-1 font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg break-all">
              {memory.id}
            </p>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">内容</label>
            <div className="mt-1 bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm">{memory.content}</pre>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <FileText className="w-4 h-4" />
                类型
              </div>
              <p className="font-medium">
                {contentTypeLabels[memory.content_type] || memory.content_type}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Star className="w-4 h-4" />
                重要性
              </div>
              <p className="font-medium">{(memory.importance * 100).toFixed(0)}%</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock className="w-4 h-4" />
                创建时间
              </div>
              <p className="font-medium text-sm">{formatDate(memory.created_at)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock className="w-4 h-4" />
                最后访问
              </div>
              <p className="font-medium text-sm">{formatDate(memory.last_accessed_at)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Hash className="w-4 h-4" />
                访问次数
              </div>
              <p className="font-medium">{memory.access_count}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Hash className="w-4 h-4" />
                向量维度
              </div>
              <p className="font-medium">{memory.embeddingDimension || 'N/A'}</p>
            </div>
          </div>

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" />
                标签
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {memory.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {Object.keys(memory.metadata).length > 0 && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">元数据</label>
              <pre className="mt-1 bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
                {JSON.stringify(memory.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Hierarchy */}
          {(memory.parent_id || memory.children.length > 0) && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">层次结构</label>
              <div className="mt-2 space-y-2">
                {memory.parent_id && (
                  <p className="text-sm">
                    <span className="text-gray-500">父节点:</span>{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">{memory.parent_id}</code>
                  </p>
                )}
                {memory.children.length > 0 && (
                  <p className="text-sm">
                    <span className="text-gray-500">子节点:</span>{' '}
                    {memory.children.map((id) => (
                      <code key={id} className="bg-gray-100 px-2 py-0.5 rounded mr-1">
                        {id}
                      </code>
                    ))}
                  </p>
                )}
                <p className="text-sm">
                  <span className="text-gray-500">深度:</span> {memory.depth}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
