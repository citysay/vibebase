import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  Plus, 
  X, 
  RefreshCw,
  ArrowLeft,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';
import { getNewsCategories, createNewsCategory, updateNewsCategory, deleteNewsCategory } from '../utils/api';
import type { NewsCategory } from '../types';

interface CategoryManagementPageProps {
  dbPath: string;
}

// 可选的分类图标列表
const CATEGORY_ICONS = ['💻', '⚽', '📈', '🎬', '🎮', '🎵', '📚', '🍔', '✈️', '🏠', '💼', '🔬', '🎨', '🌍', '❤️', '📱'];

export default function CategoryManagementPage({ dbPath }: CategoryManagementPageProps) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    icon: '📁',
    slug: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    icon: '',
    slug: '',
  });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getNewsCategories(dbPath);
      setCategories(data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dbPath]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      await createNewsCategory(dbPath, {
        name: createFormData.name,
        description: createFormData.description,
        icon: createFormData.icon,
        slug: createFormData.slug || createFormData.name.toLowerCase().replace(/\s+/g, '-'),
      });

      // Reset form and refresh data
      setShowCreateForm(false);
      setCreateFormData({
        name: '',
        description: '',
        icon: '📁',
        slug: '',
      });
      fetchCategories(true);
    } catch (error: any) {
      setCreateError(error.message || '创建分类失败');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (category: NewsCategory) => {
    setEditingId(category.id);
    setEditFormData({
      name: category.name,
      description: category.description,
      icon: category.icon,
      slug: category.slug,
    });
    setUpdateError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ name: '', description: '', icon: '', slug: '' });
    setUpdateError(null);
  };

  const handleUpdateCategory = async (categoryId: string) => {
    setUpdating(true);
    setUpdateError(null);

    try {
      await updateNewsCategory(dbPath, categoryId, {
        name: editFormData.name,
        description: editFormData.description,
        icon: editFormData.icon,
        slug: editFormData.slug,
      });

      setEditingId(null);
      setEditFormData({ name: '', description: '', icon: '', slug: '' });
      fetchCategories(true);
    } catch (error: any) {
      setUpdateError(error.message || '更新分类失败');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('确定要删除这个分类吗？如果有文章使用此分类，删除将失败。')) {
      return;
    }

    setDeletingId(categoryId);
    try {
      await deleteNewsCategory(dbPath, categoryId);
      fetchCategories(true);
    } catch (error: any) {
      alert(error.message || '删除分类失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    fetchCategories(true);
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

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/news-system')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回新闻系统
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-primary-500" />
            分类管理
          </h1>
          <p className="text-gray-500 mt-1">
            管理新闻系统的分类，共 {categories.length} 个分类
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加分类
          </button>
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
      </div>

      {/* Create Category Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-500" />
                添加分类
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {createError}
                </div>
              )}

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图标 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCreateFormData(prev => ({ ...prev, icon }))}
                      className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg border-2 transition-colors ${
                        createFormData.icon === icon
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入分类名称"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                  placeholder="输入分类描述"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-gray-400 font-normal">(可选，用于URL)</span>
                </label>
                <input
                  type="text"
                  value={createFormData.slug}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例如: tech, sport, finance"
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white rounded-lg transition-colors"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      创建分类
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">所有分类</h2>
        </div>
        
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无分类，点击"添加分类"创建第一个分类
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {categories.map(category => (
              <div 
                key={category.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                {editingId === category.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    {updateError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {updateError}
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4">
                      {/* Icon Selection */}
                      <div className="flex flex-wrap gap-1 w-32">
                        {CATEGORY_ICONS.slice(0, 8).map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setEditFormData(prev => ({ ...prev, icon }))}
                            className={`w-7 h-7 text-sm flex items-center justify-center rounded border transition-colors ${
                              editFormData.icon === icon
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder="分类名称"
                        />
                        <input
                          type="text"
                          value={editFormData.description}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder="分类描述"
                        />
                        <input
                          type="text"
                          value={editFormData.slug}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, slug: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder="Slug"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateCategory(category.id)}
                          disabled={updating}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="保存"
                        >
                          {updating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {category.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{category.name}</div>
                        <div className="text-sm text-gray-500">{category.description}</div>
                        <div className="text-xs text-blue-500 font-mono mt-1">
                          ID: {category.id} | Slug: {category.slug}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={deletingId === category.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="删除"
                      >
                        {deletingId === category.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">分类数据说明</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>分类数据存储在 <code className="bg-blue-100 px-1 rounded">categories/documents.jsonl</code> 文件中</li>
          <li>新闻文章通过 <code className="bg-blue-100 px-1 rounded">categoryId</code> 外键引用分类</li>
          <li>删除分类时，如果有文章引用该分类，将无法删除（restrict 约束）</li>
        </ul>
      </div>
    </div>
  );
}
