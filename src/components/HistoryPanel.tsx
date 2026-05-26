import { useState, useEffect } from 'react';
import { Search, Trash2, Clock, Image as ImageIcon, X, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { queryHistory, deleteHistory, HistoryRecord } from '../services/historyApi';
import { formatDuration } from '../utils/formatDuration';
import ImagePreviewModal from './ImagePreviewModal';

interface HistoryPanelProps {
  onBack?: () => void;
}

export default function HistoryPanel({ onBack }: HistoryPanelProps) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    model: '',
    generate_type: '',
    prompt_keyword: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await queryHistory({
        model: filters.model || undefined,
        generate_type: filters.generate_type || undefined,
        prompt_keyword: filters.prompt_keyword || undefined,
        limit: 50,
      });
      setRecords(result.records);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
      await deleteHistory(id);
      setRecords(records.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getModelName = (model: string) => {
    const names: Record<string, string> = {
      'sensenova-6.7-flash-lite': 'Sensenova 6.7 Flash',
      'deepseek-v4-flash': 'DeepSeek V4 Flash',
      'sensenova-u1-fast': 'Sensenova U1 Fast',
      'flux-klein': 'FLUX.2 Klein',
      'joyai-image-edit': 'JoyAI Image Edit',
      'hidream-o1-image': 'HiDream-O1-Image',
    };
    return names[model] || model;
  };

  const getGenerateTypeName = (type: string) => {
    const names: Record<string, string> = {
      'text-to-image': '文生图',
      'image-to-image': '图生图',
      'edit-image': '图像编辑',
      'understand-image': '图像理解',
      'spatial-transform': '空间变换',
      'subject-driven': '主体驱动',
      'chat': '文本对话',
    };
    return names[type] || type;
  };

  return (
    <div className="p-4 bg-sidebar-bg border-t border-card-bg h-full flex flex-col">
      <div className="max-w-6xl mx-auto flex-1 flex flex-col w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-1.5 bg-deep-bg hover:bg-card-bg rounded-lg transition-colors text-sm"
              >
                <ArrowLeft size={16} className="text-text-secondary" />
                <span className="text-text-primary">返回</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-text-secondary" />
              <span className="text-sm font-medium text-text-secondary">历史记录</span>
              <span className="text-xs text-text-muted">({records.length}条)</span>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1"
          >
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            筛选
          </button>
        </div>

        {showFilters && (
          <div className="mb-4 p-3 bg-deep-bg rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">模型</label>
                <select
                  value={filters.model}
                  onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                  className="w-full px-3 py-1.5 bg-card-bg text-text-primary rounded text-sm border border-card-bg focus:border-sensenova-blue focus:outline-none"
                >
                  <option value="">全部模型</option>
                  <option value="sensenova-6.7-flash-lite">Sensenova 6.7 Flash</option>
                  <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
                  <option value="sensenova-u1-fast">Sensenova U1 Fast</option>
                  <option value="flux-klein">FLUX.2 Klein</option>
                  <option value="joyai-image-edit">JoyAI Image Edit</option>
                  <option value="hidream-o1-image">HiDream-O1-Image</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1">生成方式</label>
                <select
                  value={filters.generate_type}
                  onChange={(e) => setFilters({ ...filters, generate_type: e.target.value })}
                  className="w-full px-3 py-1.5 bg-card-bg text-text-primary rounded text-sm border border-card-bg focus:border-sensenova-blue focus:outline-none"
                >
                  <option value="">全部类型</option>
                  <option value="text-to-image">文生图</option>
                  <option value="image-to-image">图生图</option>
                  <option value="edit-image">图像编辑</option>
                  <option value="understand-image">图像理解</option>
                  <option value="spatial-transform">空间变换</option>
                  <option value="subject-driven">主体驱动</option>
                  <option value="chat">文本对话</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1">关键词搜索</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={filters.prompt_keyword}
                    onChange={(e) => setFilters({ ...filters, prompt_keyword: e.target.value })}
                    placeholder="搜索 prompt..."
                    className="w-full pl-9 pr-3 py-1.5 bg-card-bg text-text-primary rounded text-sm border border-card-bg focus:border-sensenova-blue focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setFilters({ model: '', generate_type: '', prompt_keyword: '' })}
                className="text-xs text-text-muted hover:text-text-secondary"
              >
                清除筛选
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-text-muted">加载中...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-text-muted">暂无历史记录</div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-deep-bg rounded-lg p-4 hover:bg-opacity-80 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-sensenova-blue">
                        {getModelName(record.model)}
                      </span>
                      <span className="text-xs text-text-muted">•</span>
                      <span className="text-xs text-cyan-400">
                        {getGenerateTypeName(record.generate_type)}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted mb-1">
                      {formatTime(record.request_time)}
                    </div>
                    {record.prompt && (
                      <div className="text-sm text-text-primary mb-2 line-clamp-2">
                        {record.prompt}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-text-muted">
                      {formatDuration(record.duration_ms)}
                    </span>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-1 hover:bg-card-bg rounded text-text-muted hover:text-error-red transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                      className="p-1 hover:bg-card-bg rounded text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {expandedRecord === record.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {expandedRecord === record.id && (
                  <div className="mt-4 pt-4 border-t border-card-bg space-y-3">
                    <div>
                      <div className="text-xs text-text-muted mb-1">请求 Prompt</div>
                      <div className="text-sm text-text-primary bg-card-bg rounded p-2">
                        {record.prompt || '无'}
                      </div>
                    </div>

                    {record.request_images.length > 0 && (
                      <div>
                      <div className="text-xs text-text-muted mb-1">请求图片</div>
                      <div className="flex gap-2 overflow-x-auto">
                        {record.request_images.map((img, idx) => {
                          // 判断图片 URL 类型
                          const isHttpUrl = img.startsWith('http://') || img.startsWith('https://');
                          const isDataUrl = img.startsWith('data:');
                          const src = isHttpUrl || isDataUrl || img.startsWith('/') 
                            ? img 
                            : `/api/history/images/${img}`;
                          const allImages = [
                            ...record.request_images.map(i => {
                              const isHttp = i.startsWith('http://') || i.startsWith('https://');
                              const isData = i.startsWith('data:');
                              return isHttp || isData || i.startsWith('/') ? i : `/api/history/images/${i}`;
                            }),
                            ...record.response_images.map(i => {
                              const isHttp = i.startsWith('http://') || i.startsWith('https://');
                              const isData = i.startsWith('data:');
                              return isHttp || isData || i.startsWith('/') ? i : `/api/history/images/${i}`;
                            })
                          ];
                          return (
                            <img
                              key={idx}
                              src={src}
                              alt={`Request ${idx}`}
                              className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                setPreviewImages(allImages);
                                setPreviewStartIndex(idx);
                                setPreviewOpen(true);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {record.response_result && (
                    <div>
                      <div className="text-xs text-text-muted mb-1">响应结果</div>
                      <div className="text-sm text-text-primary bg-card-bg rounded p-2">
                        {record.response_result}
                      </div>
                    </div>
                  )}

                  {record.response_images.length > 0 && (
                    <div>
                      <div className="text-xs text-text-muted mb-1">响应图片</div>
                      <div className="flex gap-2 overflow-x-auto">
                        {record.response_images.map((img, idx) => {
                          // 判断图片 URL 类型
                          const isHttpUrl = img.startsWith('http://') || img.startsWith('https://');
                          const isDataUrl = img.startsWith('data:');
                          const src = isHttpUrl || isDataUrl || img.startsWith('/') 
                            ? img 
                            : `/api/history/images/${img}`;
                          const allImages = [
                            ...record.request_images.map(i => {
                              const isHttp = i.startsWith('http://') || i.startsWith('https://');
                              const isData = i.startsWith('data:');
                              return isHttp || isData || i.startsWith('/') ? i : `/api/history/images/${i}`;
                            }),
                            ...record.response_images.map(i => {
                              const isHttp = i.startsWith('http://') || i.startsWith('https://');
                              const isData = i.startsWith('data:');
                              return isHttp || isData || i.startsWith('/') ? i : `/api/history/images/${i}`;
                            })
                          ];
                          return (
                            <img
                              key={idx}
                              src={src}
                              alt={`Response ${idx}`}
                              className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                setPreviewImages(allImages);
                                setPreviewStartIndex(record.request_images.length + idx);
                                setPreviewOpen(true);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                    <div className="grid grid-cols-2 gap-4 text-xs text-text-muted">
                      <div>
                        <span className="font-medium">请求时间:</span> {formatTime(record.request_time)}
                      </div>
                      <div>
                        <span className="font-medium">响应时间:</span> {formatTime(record.response_time)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <ImagePreviewModal
        images={previewImages}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        startIndex={previewStartIndex}
      />
    </div>
  );
}
