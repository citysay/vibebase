import { useEffect, useState, useCallback } from 'react';
import { Network, Settings } from 'lucide-react';
import GraphView from '../components/GraphView';
import { getGraphData } from '../utils/api';
import type { GraphData } from '../types';

interface GraphPageProps {
  dbPath: string;
}

export default function GraphPage({ dbPath }: GraphPageProps) {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    edges: [],
    totalEntities: 0,
    totalRelations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [maxNodes, setMaxNodes] = useState(100);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGraphData(dbPath, maxNodes);
      setGraphData(data);
    } catch (error) {
      console.error('Failed to fetch graph:', error);
    } finally {
      setLoading(false);
    }
  }, [dbPath, maxNodes]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="w-7 h-7 text-indigo-500" />
            知识图谱
          </h1>
          <p className="text-gray-500 mt-1">
            实体关系可视化 ({graphData.totalEntities} 实体, {graphData.totalRelations} 关系)
          </p>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            <label className="text-sm text-gray-600">最大节点数:</label>
            <select
              value={maxNodes}
              onChange={(e) => setMaxNodes(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">加载图谱数据...</p>
            </div>
          </div>
        ) : (
          <GraphView data={graphData} onRefresh={fetchGraph} loading={loading} />
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <strong>操作提示:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>拖拽节点可以调整位置</li>
          <li>滚轮缩放视图</li>
          <li>双击节点查看详情</li>
          <li>点击右上角按钮可全屏显示</li>
        </ul>
      </div>
    </div>
  );
}
