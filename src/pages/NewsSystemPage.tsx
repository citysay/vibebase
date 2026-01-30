import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Newspaper, 
  FolderOpen, 
  Users, 
  MessageSquare, 
  Eye, 
  Heart, 
  Calendar,
  ChevronRight,
  ArrowLeft,
  Link2,
  RefreshCw,
  Plus,
  X,
  Send
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { 
  getNewsStats, 
  getNewsCategories, 
  getNewsArticles, 
  getNewsComments,
  getNewsUsers,
  createNewsArticle,
  getNewsArticle
} from '../utils/api';
import type { NewsCategory, NewsUser, NewsArticle, NewsComment } from '../types';

interface NewsSystemPageProps {
  dbPath: string;
}

type ViewMode = 'overview' | 'articles' | 'article-detail';

export default function NewsSystemPage({ dbPath }: NewsSystemPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get view mode from URL params
  const urlView = searchParams.get('view');
  const urlArticleId = searchParams.get('id');
  const urlCategoryId = searchParams.get('category');
  
  const viewMode: ViewMode = urlView === 'article' && urlArticleId 
    ? 'article-detail' 
    : urlView === 'articles' 
    ? 'articles' 
    : 'overview';
  const [stats, setStats] = useState<{
    categoryCount: number;
    userCount: number;
    articleCount: number;
    commentCount: number;
    publishedCount: number;
    draftCount: number;
  } | null>(null);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [users, setUsers] = useState<NewsUser[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Create article form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    authorId: '',
    status: 'draft' as 'draft' | 'published',
    tags: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [statsData, categoriesData, usersData, articlesData] = await Promise.all([
        getNewsStats(dbPath),
        getNewsCategories(dbPath),
        getNewsUsers(dbPath),
        getNewsArticles(dbPath, { limit: 50 }),
      ]);
      setStats(statsData);
      setCategories(categoriesData.categories);
      setUsers(usersData.users);
      setArticles(articlesData.articles);
    } catch (error) {
      console.error('Failed to fetch news data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dbPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync URL category parameter to state and load filtered articles
  useEffect(() => {
    if (viewMode === 'articles') {
      const categoryId = urlCategoryId || '';
      if (categoryId !== selectedCategoryId) {
        setSelectedCategoryId(categoryId);
      }
      // Load articles filtered by category if specified
      const loadArticles = async () => {
        setLoading(true);
        try {
          const articlesData = await getNewsArticles(dbPath, { 
            limit: 50, 
            categoryId: categoryId || undefined 
          });
          setArticles(articlesData.articles);
        } catch (error) {
          console.error('Failed to fetch articles:', error);
        } finally {
          setLoading(false);
        }
      };
      loadArticles();
    }
  }, [viewMode, urlCategoryId, dbPath]);

  const handleArticleClick = (article: NewsArticle) => {
    // Navigate to article detail page with URL
    navigate(`/news-system?view=article&id=${article.id}`);
  };
  
  // Load article details when URL changes to article view
  useEffect(() => {
    if (viewMode === 'article-detail' && urlArticleId) {
      const loadArticleDetail = async () => {
        setLoading(true);
        try {
          // Find article from existing list or fetch it
          const existingArticle = articles.find(a => a.id === urlArticleId);
          if (existingArticle) {
            setSelectedArticle(existingArticle);
          } else {
            // Fetch the specific article
            const article = await getNewsArticle(dbPath, urlArticleId);
            setSelectedArticle(article);
          }
          
          // Fetch comments for this article
          const commentsData = await getNewsComments(dbPath, urlArticleId);
          setComments(commentsData.comments);
        } catch (error) {
          console.error('Failed to fetch article details:', error);
          setComments([]);
        } finally {
          setLoading(false);
        }
      };
      loadArticleDetail();
    }
  }, [viewMode, urlArticleId, dbPath, articles]);

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const tags = createFormData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await createNewsArticle(dbPath, {
        title: createFormData.title,
        content: createFormData.content,
        categoryId: createFormData.categoryId,
        authorId: createFormData.authorId,
        status: createFormData.status,
        tags,
      });

      // Reset form and refresh data
      setShowCreateForm(false);
      setCreateFormData({
        title: '',
        content: '',
        categoryId: '',
        authorId: '',
        status: 'draft',
        tags: '',
      });
      fetchData(true);
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create article');
    } finally {
      setCreating(false);
    }
  };

  const handleCategoryFilter = (categoryId: string) => {
    // Navigate to articles view with URL - useEffect will handle loading
    navigate(categoryId ? `/news-system?view=articles&category=${categoryId}` : '/news-system?view=articles');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
  };

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

  // Article Detail View
  if (viewMode === 'article-detail' && selectedArticle) {
    return (
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => {
            // Navigate back to articles list with URL
            navigate(urlCategoryId ? `/news-system?view=articles&category=${urlCategoryId}` : '/news-system?view=articles');
            setSelectedArticle(null);
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回文章列表
        </button>

        {/* Article Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            {/* Category & Status */}
            <div className="flex items-center gap-3 mb-4">
              {selectedArticle.category && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                  {selectedArticle.category.icon} {selectedArticle.category.name}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-sm ${
                selectedArticle.status === 'published' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {selectedArticle.status === 'published' ? '已发布' : '草稿'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedArticle.title}
            </h1>

            {/* Author & Date */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              {selectedArticle.author && (
                <div className="flex items-center gap-2">
                  <img 
                    src={selectedArticle.author.avatar} 
                    alt={selectedArticle.author.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-gray-700">{selectedArticle.author.name}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    selectedArticle.author.role === 'admin' ? 'bg-red-100 text-red-700' :
                    selectedArticle.author.role === 'editor' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedArticle.author.role}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedArticle.publishedAt)}
              </div>
            </div>

            {/* Foreign Key Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                外键关系 (Foreign Keys)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">categoryId</span>
                  <span className="text-gray-500"> → categories.</span>
                  <span className="font-mono text-blue-800">{selectedArticle.categoryId}</span>
                </div>
                <div>
                  <span className="text-blue-600">authorId</span>
                  <span className="text-gray-500"> → users.</span>
                  <span className="font-mono text-blue-800">{selectedArticle.authorId}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-1 text-gray-500">
                <Eye className="w-4 h-4" />
                {formatNumber(selectedArticle.viewCount)} 阅读
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <Heart className="w-4 h-4" />
                {formatNumber(selectedArticle.likeCount)} 点赞
              </div>
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              {selectedArticle.content.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Tags */}
            {selectedArticle.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            评论 ({comments.length})
            <span className="text-sm font-normal text-blue-600 ml-2">
              (外键: newsId → news, authorId → users, parentId → comments)
            </span>
          </h2>

          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} formatDate={formatDate} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">暂无评论</p>
          )}
        </div>
      </div>
    );
  }

  // Articles List View
  if (viewMode === 'articles') {
    return (
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => {
            // Navigate back to overview with URL
            navigate('/news-system');
            setSelectedCategoryId('');
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回概览
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="w-7 h-7 text-primary-500" />
              新闻列表
            </h1>
            <p className="text-gray-500 mt-1">
              {selectedCategoryId 
                ? `分类: ${categories.find(c => c.id === selectedCategoryId)?.name || '全部'}`
                : '全部新闻'
              } · 共 {articles.length} 篇
            </p>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategoryId}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部分类</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-4">
          {articles.map(article => (
            <div
              key={article.id}
              onClick={() => handleArticleClick(article)}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Category & Status */}
                  <div className="flex items-center gap-2 mb-2">
                    {article.category && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                        {article.category.icon} {article.category.name}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      article.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {article.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {article.title}
                  </h3>

                  {/* Preview */}
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                    {article.content.substring(0, 150)}...
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {article.author && (
                      <div className="flex items-center gap-1">
                        <img 
                          src={article.author.avatar} 
                          alt={article.author.name}
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{article.author.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(article.publishedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatNumber(article.viewCount)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {formatNumber(article.likeCount)}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 ml-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Overview Mode (default)
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-primary-500" />
            新闻系统示例
          </h1>
          <p className="text-gray-500 mt-1">
            展示 VibeBase 外键约束和 Populate 功能
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            发布新闻
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

      {/* Create Article Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-500" />
                发布新闻
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

            <form onSubmit={handleCreateArticle} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {createError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入新闻标题"
                  required
                />
              </div>

              {/* Category (Foreign Key) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-blue-500 font-normal">(外键 → categories)</span>
                </label>
                <select
                  value={createFormData.categoryId}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">选择分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Author (Foreign Key) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作者 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-blue-500 font-normal">(外键 → users)</span>
                </label>
                <select
                  value={createFormData.authorId}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, authorId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">选择作者</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={createFormData.content}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[150px]"
                  placeholder="输入新闻内容..."
                  required
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签 <span className="text-gray-400 font-normal">(用逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={createFormData.tags}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例如: AI, 科技, 创新"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={createFormData.status === 'draft'}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                      className="text-primary-500"
                    />
                    <span className="text-gray-700">草稿</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={createFormData.status === 'published'}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                      className="text-primary-500"
                    />
                    <span className="text-gray-700">立即发布</span>
                  </label>
                </div>
              </div>

              {/* Foreign Key Info */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-1">外键约束说明：</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>categoryId 必须引用已存在的分类 (onDelete: restrict)</li>
                  <li>authorId 必须引用已存在的用户 (onDelete: set_null)</li>
                </ul>
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
                      发布中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      发布新闻
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="分类数量"
            value={stats.categoryCount}
            icon={FolderOpen}
            color="blue"
          />
          <StatsCard
            title="用户数量"
            value={stats.userCount}
            icon={Users}
            color="green"
          />
          <StatsCard
            title="文章数量"
            value={stats.articleCount}
            icon={Newspaper}
            color="purple"
          />
          <StatsCard
            title="评论数量"
            value={stats.commentCount}
            icon={MessageSquare}
            color="orange"
          />
        </div>
      )}

      {/* Data Model Diagram */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-gray-400" />
          数据模型与外键关系
        </h2>
        <div className="overflow-x-auto">
          <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg font-mono whitespace-pre">
{`┌─────────────┐     ┌─────────────┐
│  categories │     │    users    │
├─────────────┤     ├─────────────┤
│ id          │     │ id          │
│ name        │     │ name        │
│ description │     │ email       │
│ icon        │     │ avatar      │
└─────────────┘     │ role        │
       ▲            └─────────────┘
       │ restrict         ▲
       │                  │ set_null
┌──────┴──────────────────┴──────┐
│              news              │
├────────────────────────────────┤
│ id                             │
│ title                          │
│ content                        │
│ categoryId  ──► categories     │
│ authorId    ──► users          │
│ status (draft/published)       │
│ publishedAt                    │
└────────────────────────────────┘
       ▲
       │ cascade
┌──────┴─────────────────────────┐
│            comments            │
├────────────────────────────────┤
│ id                             │
│ content                        │
│ newsId      ──► news (cascade) │
│ authorId    ──► users (set_null)│
│ parentId    ──► comments       │
└────────────────────────────────┘`}
          </pre>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-gray-400" />
          新闻分类
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(category => (
            <div
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-gray-100 hover:border-blue-200"
            >
              <div className="text-3xl mb-2">{category.icon}</div>
              <div className="font-medium text-gray-900">{category.name}</div>
              <div className="text-sm text-gray-500 truncate">{category.description}</div>
              <div className="text-xs text-blue-500 mt-2 font-mono">ID: {category.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          系统用户
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {users.map(user => (
            <div
              key={user.id}
              className="p-4 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    user.role === 'admin' ? 'bg-red-100 text-red-700' :
                    user.role === 'editor' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'reader' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
              <div className="text-xs text-blue-500 mt-1 font-mono">ID: {user.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-gray-400" />
            最新文章
          </h2>
          <button
            onClick={() => {
              setSelectedCategoryId('');
              // Navigate to articles view with URL
              navigate('/news-system?view=articles');
            }}
            className="text-primary-500 hover:text-primary-600 text-sm flex items-center gap-1"
          >
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {articles.slice(0, 5).map(article => (
            <div
              key={article.id}
              onClick={() => handleArticleClick(article)}
              className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-gray-100 hover:border-blue-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {article.category && (
                      <span className="text-sm">{article.category.icon}</span>
                    )}
                    <span className="font-medium text-gray-900">{article.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {article.author && (
                      <span>{article.author.name}</span>
                    )}
                    <span>{formatDate(article.publishedAt)}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {formatNumber(article.viewCount)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Comment Item Component (recursive for nested comments)
function CommentItem({ comment, formatDate, depth = 0 }: { 
  comment: NewsComment; 
  formatDate: (t: number) => string;
  depth?: number;
}) {
  return (
    <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''}`}>
      <div className="flex items-start gap-3">
        {comment.author && (
          <img 
            src={comment.author.avatar} 
            alt={comment.author.name}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {comment.author && (
              <>
                <span className="font-medium text-gray-900">{comment.author.name}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  comment.author.role === 'admin' ? 'bg-red-100 text-red-700' :
                  comment.author.role === 'editor' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {comment.author.role}
                </span>
              </>
            )}
            <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-gray-700 mb-2">{comment.content}</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> {comment.likeCount}
            </span>
            <span className="font-mono text-blue-500">ID: {comment.id}</span>
            {comment.parentId && (
              <span className="font-mono text-purple-500">parentId: {comment.parentId}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} formatDate={formatDate} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
