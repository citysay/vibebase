import { useState } from 'react';
import { Database, FolderOpen, AlertCircle, Loader2, Search, FolderTree } from 'lucide-react';
import { validateDatabase, listDatabases } from '../utils/api';
import type { DatabaseInfo } from '../types';

interface DatabaseSelectorProps {
  onSelect: (path: string, info: DatabaseInfo) => void;
}

export default function DatabaseSelector({ onSelect }: DatabaseSelectorProps) {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) {
      setError('请输入数据库路径');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await validateDatabase(path.trim());
      if (result.valid && result.info) {
        onSelect(path.trim(), result.info);
      } else {
        setError(result.error || '无效的数据库路径');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!path.trim()) {
      setError('请先输入目录路径');
      return;
    }

    setScanning(true);
    setError('');
    setDatabases([]);

    try {
      const result = await listDatabases(path.trim());
      if (result.databases.length === 0) {
        setError('未找到数据库');
      } else {
        setDatabases(result.databases);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '扫描失败');
    } finally {
      setScanning(false);
    }
  };

  const handleSelectDatabase = (db: DatabaseInfo) => {
    onSelect(db.path, db);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl mb-4">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AIDB Viewer</h1>
          <p className="text-gray-400 mt-2">数据库可视化查看器</p>
        </div>

        {/* Connection Form */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              数据库路径
            </label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="例如: D:\my-database 或 ./data/aidb"
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading || scanning}
              />
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={loading || scanning}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    连接
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleScan}
                disabled={loading || scanning}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                title="扫描目录下的所有数据库"
              >
                {scanning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FolderTree className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>

          {/* Database List */}
          {databases.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                发现 {databases.length} 个数据库
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {databases.map((db) => (
                  <button
                    key={db.path}
                    onClick={() => handleSelectDatabase(db)}
                    className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{db.name}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{db.memoryCount} 记忆</span>
                        <span>{db.entityCount} 实体</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{db.path}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">支持的数据库格式</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• AIDB/VibeBase 数据库目录</li>
              <li>• 包含 documents.jsonl 的文件夹</li>
              <li>• 包含 hnsw.index 的文件夹</li>
              <li>• 包含 graph/ 子目录的文件夹</li>
              <li>• 点击 <FolderTree className="w-3 h-3 inline" /> 扫描子目录</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-6">
          AIDB Viewer v1.0.0
        </p>
      </div>
    </div>
  );
}
