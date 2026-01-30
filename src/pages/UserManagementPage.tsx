import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import CrudTable, { FieldConfig } from '../components/CrudTable';
import { getNewsUsers, createNewsUser, updateNewsUser, deleteNewsUser } from '../utils/api';
import type { NewsUser } from '../types';

interface UserManagementPageProps {
  dbPath: string;
}

// 用户角色选项
const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'editor', label: '编辑' },
  { value: 'reader', label: '读者' },
  { value: 'guest', label: '访客' },
];

// 头像选项
const AVATAR_SEEDS = [
  'zhangsan', 'lisi', 'wangwu', 'zhaoliu', 
  'xiaoming', 'xiaohong', 'xiaoli', 'xiaozhang',
  'admin', 'editor', 'user', 'guest'
];

export default function UserManagementPage({ dbPath }: UserManagementPageProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<NewsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 字段配置
  const fields: FieldConfig[] = [
    {
      key: 'avatar',
      label: '头像',
      type: 'select',
      options: AVATAR_SEEDS.map(seed => ({
        value: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
        label: seed,
      })),
      showInTable: true,
      showInForm: true,
      width: '80px',
      render: (value: string) => (
        <img src={value} alt="avatar" className="w-10 h-10 rounded-full" />
      ),
    },
    {
      key: 'id',
      label: 'ID',
      type: 'text',
      showInTable: true,
      showInForm: false,
      editable: false,
      width: '150px',
      render: (value: string) => (
        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {value}
        </span>
      ),
    },
    {
      key: 'name',
      label: '用户名',
      type: 'text',
      required: true,
      placeholder: '请输入用户名',
      showInTable: true,
      showInForm: true,
    },
    {
      key: 'email',
      label: '邮箱',
      type: 'email',
      required: true,
      placeholder: '请输入邮箱地址',
      showInTable: true,
      showInForm: true,
    },
    {
      key: 'role',
      label: '角色',
      type: 'select',
      options: ROLE_OPTIONS,
      required: true,
      showInTable: true,
      showInForm: true,
      width: '120px',
      render: (value: string) => {
        const roleStyles: Record<string, string> = {
          admin: 'bg-red-100 text-red-700',
          editor: 'bg-purple-100 text-purple-700',
          reader: 'bg-blue-100 text-blue-700',
          guest: 'bg-gray-100 text-gray-700',
        };
        const roleLabels: Record<string, string> = {
          admin: '管理员',
          editor: '编辑',
          reader: '读者',
          guest: '访客',
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${roleStyles[value] || roleStyles.guest}`}>
            {roleLabels[value] || value}
          </span>
        );
      },
    },
  ];

  // 获取用户列表
  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getNewsUsers(dbPath);
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dbPath]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 创建用户
  const handleCreate = async (data: Partial<NewsUser>) => {
    await createNewsUser(dbPath, {
      name: data.name!,
      email: data.email!,
      avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
      role: data.role as 'admin' | 'editor' | 'reader' | 'guest',
    });
    fetchUsers(true);
  };

  // 更新用户
  const handleUpdate = async (id: string, data: Partial<NewsUser>) => {
    await updateNewsUser(dbPath, id, {
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: data.role as 'admin' | 'editor' | 'reader' | 'guest',
    });
    fetchUsers(true);
  };

  // 删除用户
  const handleDelete = async (id: string) => {
    await deleteNewsUser(dbPath, id);
    fetchUsers(true);
  };

  // 刷新
  const handleRefresh = () => {
    fetchUsers(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/news-system')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回新闻系统
      </button>

      {/* CRUD 表格 */}
      <CrudTable<NewsUser>
        data={users}
        loading={loading || refreshing}
        total={users.length}
        fields={fields}
        title="用户管理"
        icon={<Users className="w-7 h-7 text-primary-500" />}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
        canCreate={true}
        canEdit={true}
        canDelete={true}
        canSearch={false}
      />

      {/* 说明信息 */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">用户数据说明</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>用户数据存储在 <code className="bg-blue-100 px-1 rounded">users/documents.jsonl</code> 文件中</li>
          <li>新闻文章和评论通过 <code className="bg-blue-100 px-1 rounded">authorId</code> 外键引用用户</li>
          <li>删除用户时，如果有文章或评论引用该用户，相关字段会设置为 null (set_null 约束)</li>
        </ul>
      </div>
    </div>
  );
}
