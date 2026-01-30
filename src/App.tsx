import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MemoriesPage from './pages/MemoriesPage';
import EntitiesPage from './pages/EntitiesPage';
import RelationsPage from './pages/RelationsPage';
import GraphPage from './pages/GraphPage';
import NewsSystemPage from './pages/NewsSystemPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import DatabaseSelector from './components/DatabaseSelector';
import type { DatabaseInfo } from './types';

function App() {
  const [dbPath, setDbPath] = useState<string>('');
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);

  // Load saved path from localStorage
  useEffect(() => {
    const savedPath = localStorage.getItem('aidb-viewer-path');
    if (savedPath) {
      setDbPath(savedPath);
    }
  }, []);

  // Save path to localStorage when it changes
  useEffect(() => {
    if (dbPath) {
      localStorage.setItem('aidb-viewer-path', dbPath);
    }
  }, [dbPath]);

  const handleDatabaseSelect = (path: string, info: DatabaseInfo) => {
    setDbPath(path);
    setDbInfo(info);
  };

  const handleDisconnect = () => {
    setDbPath('');
    setDbInfo(null);
    localStorage.removeItem('aidb-viewer-path');
  };

  if (!dbPath) {
    return <DatabaseSelector onSelect={handleDatabaseSelect} />;
  }

  return (
    <Layout dbPath={dbPath} dbInfo={dbInfo} onDisconnect={handleDisconnect}>
      <Routes>
        <Route path="/" element={<Dashboard dbPath={dbPath} />} />
        <Route path="/memories" element={<MemoriesPage dbPath={dbPath} />} />
        <Route path="/entities" element={<EntitiesPage dbPath={dbPath} />} />
        <Route path="/relations" element={<RelationsPage dbPath={dbPath} />} />
        <Route path="/graph" element={<GraphPage dbPath={dbPath} />} />
        <Route path="/news-system" element={<NewsSystemPage dbPath={dbPath} />} />
        <Route path="/category-management" element={<CategoryManagementPage dbPath={dbPath} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
