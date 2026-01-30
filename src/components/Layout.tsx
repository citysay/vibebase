import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Brain, 
  Users, 
  GitBranch, 
  Network,
  Database,
  LogOut,
  Newspaper,
  FolderOpen
} from 'lucide-react';
import type { DatabaseInfo } from '../types';

interface LayoutProps {
  children: ReactNode;
  dbPath: string;
  dbInfo: DatabaseInfo | null;
  onDisconnect: () => void;
}

const navItems: { to: string; icon: any; label: string; highlight?: boolean }[] = [
  { to: '/', icon: LayoutDashboard, label: '概览' },
  { to: '/memories', icon: Brain, label: '记忆' },
  { to: '/entities', icon: Users, label: '实体' },
  { to: '/relations', icon: GitBranch, label: '关系' },
  { to: '/graph', icon: Network, label: '图谱' },
  { to: '/news-system', icon: Newspaper, label: '新闻系统' },
  { to: '/category-management', icon: FolderOpen, label: '分类管理' },
];

export default function Layout({ children, dbPath, dbInfo, onDisconnect }: LayoutProps) {
  const dbName = dbPath.split(/[/\\]/).pop() || 'Database';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary-400" />
            AIDB Viewer
          </h1>
        </div>

        {/* Database Info */}
        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
          <div className="text-sm text-gray-400 mb-1">当前数据库</div>
          <div className="font-medium truncate" title={dbPath}>{dbName}</div>
          {dbInfo && (
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <div>记忆: {dbInfo.memoryCount}</div>
              <div>实体: {dbInfo.entityCount}</div>
              <div>关系: {dbInfo.relationCount}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(({ to, icon: Icon, label, highlight }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : highlight
                        ? 'text-yellow-400 hover:bg-gray-800 hover:text-yellow-300 border border-yellow-600/30'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                  {highlight && (
                    <span className="ml-auto text-xs bg-yellow-600 text-yellow-100 px-1.5 py-0.5 rounded">
                      示例
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Disconnect Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onDisconnect}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            断开连接
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
