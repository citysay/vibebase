import { useEffect, useState, useCallback } from 'react';
import { GitBranch, ArrowRight } from 'lucide-react';
import DataTable from '../components/DataTable';
import { getRelations } from '../utils/api';
import type { Relation } from '../types';

interface RelationsPageProps {
  dbPath: string;
}

export default function RelationsPage({ dbPath }: RelationsPageProps) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const fetchRelations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRelations(dbPath, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setRelations(data.relations);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch relations:', error);
    } finally {
      setLoading(false);
    }
  }, [dbPath, page]);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const truncateId = (id: string, maxLength = 12) => {
    if (id.length <= maxLength) return id;
    return id.slice(0, maxLength) + '...';
  };

  const columns = [
    {
      key: 'source',
      header: '源实体',
      width: '20%',
      render: (item: Relation) => (
        <code className="text-sm bg-gray-100 px-2 py-1 rounded" title={item.source}>
          {truncateId(item.source)}
        </code>
      ),
    },
    {
      key: 'relation_type',
      header: '关系类型',
      width: '20%',
      render: (item: Relation) => (
        <div className="flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
            {item.relation_type}
          </span>
          {item.bidirectional && (
            <span className="text-xs text-gray-400">(双向)</span>
          )}
        </div>
      ),
    },
    {
      key: 'target',
      header: '目标实体',
      width: '20%',
      render: (item: Relation) => (
        <code className="text-sm bg-gray-100 px-2 py-1 rounded" title={item.target}>
          {truncateId(item.target)}
        </code>
      ),
    },
    {
      key: 'weight',
      header: '权重',
      width: '10%',
      render: (item: Relation) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${item.weight * 100}%` }}
            />
          </div>
          <span className="text-sm text-gray-500">{item.weight.toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'metadata',
      header: '元数据',
      width: '15%',
      render: (item: Relation) => {
        const propCount = Object.keys(item.metadata).length;
        if (propCount === 0) return <span className="text-gray-400">-</span>;
        return (
          <span className="text-gray-500 text-sm" title={JSON.stringify(item.metadata, null, 2)}>
            {propCount} 项
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: '创建时间',
      width: '15%',
      render: (item: Relation) => (
        <span className="text-gray-500">{formatDate(item.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-purple-500" />
            关系列表
          </h1>
          <p className="text-gray-500 mt-1">共 {total} 个关系</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={relations}
        columns={columns}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={loading}
      />
    </div>
  );
}
