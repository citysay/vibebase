import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// 字段类型定义
export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'textarea' | 'number' | 'icon';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[]; // 用于 select 类型
  render?: (value: any, record: any) => React.ReactNode; // 自定义渲染
  editable?: boolean; // 是否可编辑，默认 true
  showInTable?: boolean; // 是否在表格中显示，默认 true
  showInForm?: boolean; // 是否在表单中显示，默认 true
  width?: string; // 列宽
}

// 组件属性
export interface CrudTableProps<T extends { id: string }> {
  // 数据
  data: T[];
  loading?: boolean;
  total?: number;

  // 字段配置
  fields: FieldConfig[];

  // 标题
  title: string;
  icon?: React.ReactNode;

  // 回调函数
  onCreate?: (data: Partial<T>) => Promise<void>;
  onUpdate?: (id: string, data: Partial<T>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onRefresh?: () => void;

  // 可选功能
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canSearch?: boolean;

  // 搜索
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;

  // 分页
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;

  // 自定义操作按钮
  extraActions?: (record: T) => React.ReactNode;

  // 删除前的校验
  canDeleteRecord?: (record: T) => { allowed: boolean; reason?: string };

  // 图标选择器选项
  iconOptions?: string[];

  // 行点击事件
  onRowClick?: (record: T) => void;

  // 可点击的字段（点击时触发 onRowClick）
  clickableFields?: string[];
}

export default function CrudTable<T extends { id: string }>({
  data,
  loading = false,
  total,
  fields,
  title,
  icon,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canSearch = true,
  searchPlaceholder = '搜索...',
  onSearch,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  extraActions,
  canDeleteRecord,
  iconOptions = ['👤', '👨‍💼', '👩‍💼', '🧑‍💻', '👨‍🎓', '👩‍🎓', '🧑‍🔬', '👨‍⚕️'],
  onRowClick,
  clickableFields = [],
}: CrudTableProps<T>) {
  // 状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 获取表格显示的字段
  const tableFields = fields.filter((f) => f.showInTable !== false);
  // 获取表单显示的字段
  const formFields = fields.filter((f) => f.showInForm !== false);

  // 初始化表单数据
  const initFormData = useCallback(() => {
    const initial: Record<string, any> = {};
    formFields.forEach((field) => {
      if (field.type === 'select' && field.options?.length) {
        initial[field.key] = field.options[0].value;
      } else if (field.type === 'icon') {
        initial[field.key] = iconOptions[0] || '👤';
      } else {
        initial[field.key] = '';
      }
    });
    return initial;
  }, [formFields, iconOptions]);

  // 打开创建模态框
  const handleOpenCreate = () => {
    setFormData(initFormData());
    setError(null);
    setShowCreateModal(true);
  };

  // 关闭创建模态框
  const handleCloseCreate = () => {
    setShowCreateModal(false);
    setFormData({});
    setError(null);
  };

  // 创建记录
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreate) return;

    setSaving(true);
    setError(null);

    try {
      await onCreate(formData as Partial<T>);
      handleCloseCreate();
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  // 开始编辑
  const handleStartEdit = (record: T) => {
    setEditingId(record.id);
    const editData: Record<string, any> = {};
    formFields.forEach((field) => {
      editData[field.key] = (record as any)[field.key] ?? '';
    });
    setEditFormData(editData);
    setError(null);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
    setError(null);
  };

  // 保存编辑
  const handleSaveEdit = async (id: string) => {
    if (!onUpdate) return;

    setSaving(true);
    setError(null);

    try {
      await onUpdate(id, editFormData as Partial<T>);
      handleCancelEdit();
    } catch (err: any) {
      setError(err.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!onDelete) return;

    const record = data.find((d) => d.id === id);
    if (record && canDeleteRecord) {
      const { allowed, reason } = canDeleteRecord(record);
      if (!allowed) {
        alert(reason || '无法删除此记录');
        return;
      }
    }

    if (!window.confirm('确定要删除这条记录吗？')) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (err: any) {
      alert(err.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // 搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  // 渲染表单字段
  const renderFormField = (
    field: FieldConfig,
    value: any,
    onChange: (key: string, value: any) => void
  ) => {
    const baseClass =
      'w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={baseClass}
            required={field.required}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={`${baseClass} min-h-[100px]`}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'icon':
        return (
          <div className="flex flex-wrap gap-2">
            {iconOptions.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => onChange(field.key, icon)}
                className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg border-2 transition-colors ${
                  value === icon
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={baseClass}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={baseClass}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={baseClass}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  // 渲染单元格内容
  const renderCell = (field: FieldConfig, record: T) => {
    const value = (record as any)[field.key];

    if (field.render) {
      return field.render(value, record);
    }

    if (field.type === 'select' && field.options) {
      const option = field.options.find((o) => o.value === value);
      return option?.label || value;
    }

    return value;
  };

  // 计算分页
  const totalPages = total ? Math.ceil(total / pageSize) : Math.ceil(data.length / pageSize);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {icon}
            {title}
          </h1>
          <p className="text-gray-500 mt-1">共 {total ?? data.length} 条记录</p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && onCreate && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          )}
        </div>
      </div>

      {/* 搜索栏 */}
      {canSearch && onSearch && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            搜索
          </button>
        </form>
      )}

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {tableFields.map((field) => (
                    <th
                      key={field.key}
                      className="px-4 py-3 text-left text-sm font-medium text-gray-600"
                      style={{ width: field.width }}
                    >
                      {field.label}
                    </th>
                  ))}
                  {(canEdit || canDelete || extraActions) && (
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 w-32">
                      操作
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    {editingId === record.id ? (
                      // 编辑模式
                      <>
                        {tableFields.map((field) => (
                          <td key={field.key} className="px-4 py-3">
                            {field.editable === false ? (
                              renderCell(field, record)
                            ) : (
                              <div className="max-w-xs">
                                {renderFormField(
                                  field,
                                  editFormData[field.key],
                                  (key, value) =>
                                    setEditFormData((prev) => ({ ...prev, [key]: value }))
                                )}
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(record.id)}
                              disabled={saving}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="保存"
                            >
                              {saving ? (
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
                        </td>
                      </>
                    ) : (
                      // 查看模式
                      <>
                        {tableFields.map((field) => {
                          const isClickable = clickableFields.includes(field.key) && onRowClick;
                          return (
                            <td key={field.key} className="px-4 py-3 text-gray-700">
                              {isClickable ? (
                                <button
                                  type="button"
                                  onClick={() => onRowClick(record)}
                                  className="text-left text-primary-600 hover:text-primary-800 hover:underline cursor-pointer font-medium"
                                >
                                  {renderCell(field, record)}
                                </button>
                              ) : (
                                renderCell(field, record)
                              )}
                            </td>
                          );
                        })}
                        {(canEdit || canDelete || extraActions) && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {extraActions?.(record)}
                              {canEdit && onUpdate && (
                                <button
                                  onClick={() => handleStartEdit(record)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="编辑"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && onDelete && (
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  disabled={deletingId === record.id}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="删除"
                                >
                                  {deletingId === record.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && onPageChange && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 创建模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-500" />
                添加{title.replace('管理', '')}
              </h2>
              <button
                onClick={handleCloseCreate}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {error}
                </div>
              )}

              {formFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderFormField(field, formData[field.key], (key, value) =>
                    setFormData((prev) => ({ ...prev, [key]: value }))
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseCreate}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white rounded-lg transition-colors"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      创建
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
