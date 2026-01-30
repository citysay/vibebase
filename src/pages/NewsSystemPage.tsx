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
  ArrowLeft,
  Link2,
} from 'lucide-react';
import CrudTable, { FieldConfig } from '../components/CrudTable';
import StatsCard from '../components/StatsCard';
import { 
  getNewsStats, 
  getNewsCategories, 
  getNewsUsers,
  getNewsArticles,
  getNewsArticle,
  getNewsComments,
  createNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
} from '../utils/api';
import type { NewsCategory, NewsUser, NewsArticle, NewsComment } from '../types';

interface NewsSystemPageProps {
  dbPath: string;
}

type ViewMode = 'list' | 'detail';

export default function NewsSystemPage({ dbPath }: NewsSystemPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 从 URL 获取视图模式
  const urlView = searchParams.get('view');
  const urlArticleId = searchParams.get('id');
  const viewMode: ViewMode = urlView === 'article' && urlArticleId ? 'detail' : 'list';

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
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, categoriesData, usersData, articlesData] = await Promise.all([
        getNewsStats(dbPath),
        getNewsCategories(dbPath),
        getNewsUsers(dbPath),
        getNewsArticles(dbPath, { limit: 100, search: searchQuery || undefined }),
      ]);
      setStats(statsData);
      setCategories(categoriesData.categories);
      setUsers(usersData.users);
      setArticles(articlesData.articles);
    } catch (error) {
      console.error('Failed to fetch news data:', error);
    } finally {
      setLoading(false);
    }
  }, [dbPath, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 加载文章详情
  useEffect(() => {
    if (viewMode === 'detail' && urlArticleId) {
      const loadArticleDetail = async () => {
        setLoading(true);
        try {
          const existingArticle = articles.find(a => a.id === urlArticleId);
          if (existingArticle) {
            setSelectedArticle(existingArticle);
          } else {
            const article = await getNewsArticle(dbPath, urlArticleId);
            setSelectedArticle(article);
          }
          
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreate = async (data: Partial<NewsArticle>) => {
    await createNewsArticle(dbPath, {
      title: data.title || '',
      content: data.content || '',
      categoryId: data.categoryId || '',
      authorId: data.authorId || '',
      status: (data.status as 'draft' | 'published') || 'draft',
      tags: [],
    });
    fetchData();
  };

  const handleUpdate = async (id: string, data: Partial<NewsArticle>) => {
    await updateNewsArticle(dbPath, id, {
      title: data.title,
      content: data.content,
      categoryId: data.categoryId,
      authorId: data.authorId,
      status: data.status as 'draft' | 'published',
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await deleteNewsArticle(dbPath, id);
    fetchData();
  };

  const handleArticleClick = (article: NewsArticle) => {
    navigate(`/news-system?view=article&id=${article.id}`);
  };

  const handleBackToList = () => {
    navigate('/news-system');
    setSelectedArticle(null);
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

  // 定义新闻字段配置
  const newsFields: FieldConfig[] = [
    {
      key: 'title',
      label: '标题',
      type: 'text',
      required: true,
      placeholder: '请输入新闻标题',
      width: '25%',
    },
    {
      key: 'content',
      label: '内容',
      type: 'textarea',
      required: true,
      placeholder: '请输入新闻内容',
      showInTable: false,
    },
    {
      key: 'categoryId',
      label: '分类',
      type: 'select',
      required: true,
      options: categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` })),
      render: (value: string, record: NewsArticle) => {
        if (record.category) {
          return (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              {record.category.icon} {record.category.name}
            </span>
          );
        }
        return value || '-';
      },
    },
    {
      key: 'authorId',
      label: '作者',
      type: 'select',
      required: true,
      options: users.map(u => ({ value: u.id, label: `${u.name} (${u.role})` })),
      render: (value: string, record: NewsArticle) => {
        if (record.author) {
          return (
            <div className="flex items-center gap-2">
              <img 
                src={record.author.avatar} 
                alt={record.author.name}
                className="w-6 h-6 rounded-full"
              />
              <span>{record.author.name}</span>
            </div>
          );
        }
        return value || '-';
      },
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [
        { value: 'draft', label: '草稿' },
        { value: 'published', label: '已发布' },
      ],
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-sm ${
          value === 'published' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {value === 'published' ? '已发布' : '草稿'}
        </span>
      ),
    },
    {
      key: 'viewCount',
      label: '阅读',
      type: 'number',
      showInForm: false,
      editable: false,
      render: (value: number) => (
        <span className="text-gray-500">{value?.toLocaleString() || 0}</span>
      ),
    },
    {
      key: 'publishedAt',
      label: '发布时间',
      type: 'text',
      showInForm: false,
      editable: false,
      render: (value: number) => (
        <span className="text-gray-500 text-sm">{value ? formatDate(value) : '-'}</span>
      ),
    },
  ];

  // 文章详情页
  if (viewMode === 'detail' && selectedArticle) {
    return (
      <div className="p-6 space-y-6">
        {/* 返回按钮 */}
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回新闻列表
        </button>

        {/* 文章内容 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            {/* 分类和状态 */}
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

            {/* 标题 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedArticle.title}
            </h1>

            {/* 作者和时间 */}
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

            {/* 外键关系 */}
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

            {/* 统计 */}
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

            {/* 内容 */}
            <div className="prose max-w-none">
              {selectedArticle.content.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* 标签 */}
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
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

        {/* 评论区 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            评论 ({comments.length})
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

  // 新闻列表页
  return (
    <div className="p-6 space-y-6">
      {/* 统计卡片 */}
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
            title="已发布"
            value={stats.publishedCount}
            icon={Newspaper}
            color="orange"
          />
        </div>
      )}

      {/* 新闻 CRUD 表格 */}
      <CrudTable<NewsArticle>
        data={articles}
        loading={loading}
        total={articles.length}
        fields={newsFields}
        title="新闻管理"
        icon={<Newspaper className="w-7 h-7 text-primary-500" />}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRefresh={fetchData}
        onSearch={handleSearch}
        searchPlaceholder="搜索新闻标题或内容..."
        canCreate={true}
        canEdit={true}
        canDelete={true}
        onRowClick={handleArticleClick}
        clickableFields={['title']}
      />
    </div>
  );
}

// 评论组件
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
          </div>
        </div>
      </div>
      
      {/* 嵌套回复 */}
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
