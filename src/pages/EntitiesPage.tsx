import { useEffect, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import DataTable from '../components/DataTable';
import { getEntities } from '../utils/api';
import type { Entity } from '../types';

interface EntitiesPageProps {
  dbPath: string;
}

export default function EntitiesPage({ dbPath }: EntitiesPageProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEntities(dbPath, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setEntities(data.entities);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  }, [dbPath, page]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const typeColors: Record<string, string> = {
    person: 'bg-blue-100 text-blue-700',
    organization: 'bg-green-100 text-green-700',
    location: 'bg-amber-100 text-amber-700',
    event: 'bg-red-100 text-red-700',
    concept: 'bg-purple-100 text-purple-700',
    object: 'bg-pink-100 text-pink-700',
    document: 'bg-indigo-100 text-indigo-700',
    topic: 'bg-teal-100 text-teal-700',
  };

  const columns = [
    {
      key: 'name',
      header: '名称',
      width: '25%',
      render: (item: Entity) => (
        <span className="font-medium text-gray-900">{item.name}</span>
      ),
    },
    {
      key: 'entity_type',
      header: '类型',
      width: '15%',
      render: (item: Entity) => (
        <span className={`px-2 py-1 rounded text-xs ${typeColors[item.entity_type] || 'bg-gray-100 text-gray-700'}`}>
          {item.entity_type}
        </span>
      ),
    },
    {
      key: 'properties',
      header: '属性',
      width: '30%',
      render: (item: Entity) => {
        const propCount = Object.keys(item.properties).length;
        if (propCount === 0) return <span className="text-gray-400">-</span>;
        const preview = Object.entries(item.properties)
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(', ');
        return (
          <span className="text-gray-600 text-sm" title={JSON.stringify(item.properties, null, 2)}>
            {preview}
            {propCount > 2 && ` (+${propCount - 2})`}
          </span>
        );
      },
    },
    {
      key: 'memory_refs',
      header: '关联记忆',
      width: '10%',
      render: (item: Entity) => (
        <span className="text-gray-500">{item.memory_refs?.length || 0}</span>
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      width: '15%',
      render: (item: Entity) => (
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
            <Users className="w-7 h-7 text-green-500" />
            实体列表
          </h1>
          <p className="text-gray-500 mt-1">共 {total} 个实体</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={entities}
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
