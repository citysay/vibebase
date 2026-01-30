import { useEffect, useState, useCallback } from 'react';
import { Brain, Users, GitBranch, Database, Tag, FileText, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatsCard from '../components/StatsCard';
import { getDatabaseStats, getTags, getContentTypes, getImportanceDistribution } from '../utils/api';
import type { DatabaseInfo, TagCount, TypeCount, ImportanceDistribution } from '../types';

interface DashboardProps {
  dbPath: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard({ dbPath }: DashboardProps) {
  const [stats, setStats] = useState<DatabaseInfo | null>(null);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [contentTypes, setContentTypes] = useState<TypeCount[]>([]);
  const [importanceDist, setImportanceDist] = useState<ImportanceDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [statsData, tagsData, typesData, importanceData] = await Promise.all([
        getDatabaseStats(dbPath),
        getTags(dbPath),
        getContentTypes(dbPath),
        getImportanceDistribution(dbPath),
      ]);
      setStats(statsData);
      setTags(tagsData.tags.slice(0, 10));
      setContentTypes(typesData.types);
      setImportanceDist(importanceData.distribution);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dbPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  const contentTypeLabels: Record<string, string> = {
    text: '文本',
    image: '图片',
    code: '代码',
    conversation: '对话',
    document: '文档',
    other: '其他',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据库概览</h1>
          <p className="text-gray-500 mt-1">{dbPath}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400 text-white rounded-lg transition-colors"
          title="刷新数据"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="记忆数量"
          value={stats?.memoryCount || 0}
          icon={Brain}
          color="blue"
        />
        <StatsCard
          title="实体数量"
          value={stats?.entityCount || 0}
          icon={Users}
          color="green"
        />
        <StatsCard
          title="关系数量"
          value={stats?.relationCount || 0}
          icon={GitBranch}
          color="purple"
        />
        <StatsCard
          title="HNSW 索引"
          value={stats?.hasHnswIndex ? '已启用' : '未启用'}
          icon={Database}
          color={stats?.hasHnswIndex ? 'green' : 'orange'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Types */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            内容类型分布
          </h2>
          {contentTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={contentTypes.map((t) => ({
                    name: contentTypeLabels[t.type] || t.type,
                    value: t.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contentTypes.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              暂无数据
            </div>
          )}
        </div>

        {/* Importance Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">重要性分布</h2>
          {importanceDist.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={importanceDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-gray-400" />
          热门标签
        </h2>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t.tag}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors cursor-default"
              >
                {t.tag}
                <span className="ml-2 text-gray-400">({t.count})</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">暂无标签</p>
        )}
      </div>
    </div>
  );
}
