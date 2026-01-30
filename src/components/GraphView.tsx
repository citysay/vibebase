import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import type { GraphData } from '../types';

interface GraphViewProps {
  data: GraphData;
  onRefresh?: () => void;
  loading?: boolean;
}

const groupColors: Record<string, string> = {
  person: '#3B82F6',      // blue
  organization: '#10B981', // green
  location: '#F59E0B',    // amber
  event: '#EF4444',       // red
  concept: '#8B5CF6',     // purple
  object: '#EC4899',      // pink
  document: '#6366F1',    // indigo
  topic: '#14B8A6',       // teal
  default: '#6B7280',     // gray
};

export default function GraphView({ data, onRefresh, loading }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0) return;

    const nodes = new DataSet(
      data.nodes.map((node) => ({
        ...node,
        color: {
          background: groupColors[node.group] || groupColors.default,
          border: groupColors[node.group] || groupColors.default,
          highlight: {
            background: groupColors[node.group] || groupColors.default,
            border: '#1F2937',
          },
        },
        font: { color: '#ffffff', size: 12 },
        shape: 'dot',
        size: 20,
      }))
    );

    const edges = new DataSet(
      data.edges.map((edge) => ({
        ...edge,
        color: { color: '#9CA3AF', highlight: '#4B5563' },
        font: { size: 10, color: '#6B7280', align: 'middle' },
        smooth: { type: 'continuous' },
      }))
    );

    const options = {
      nodes: {
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        width: 1,
        shadow: true,
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08,
        },
        stabilization: {
          iterations: 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true,
      },
    };

    networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

    return () => {
      networkRef.current?.destroy();
    };
  }, [data]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const fitNetwork = () => {
    networkRef.current?.fit({ animation: true });
  };

  if (data.nodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
        暂无图谱数据
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="text-sm text-gray-600">
          节点: {data.nodes.length} / {data.totalEntities} | 
          边: {data.edges.length} / {data.totalRelations}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={fitNetwork}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="适应视图"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className={`${isFullscreen ? 'h-[calc(100%-48px)]' : 'h-[500px]'}`}
      />

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs">
          {Object.entries(groupColors)
            .filter(([key]) => key !== 'default')
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-600">{type}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
