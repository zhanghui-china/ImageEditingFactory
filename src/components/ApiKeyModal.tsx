import { useState } from 'react';
import { X, Key, Loader2, AlertCircle } from 'lucide-react';
import { useStore } from '../store';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [tempKey, setTempKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const { setApiKey } = useStore();

  const handleSave = async () => {
    if (!tempKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    if (!tempKey.startsWith('sk-')) {
      setError('API Key 必须以 sk- 开头');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await fetch('https://token.sensenova.cn/v1/models', {
        headers: {
          Authorization: `Bearer ${tempKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('API Key 无效');
      }

      setApiKey(tempKey);
      localStorage.setItem('sensenova_api_key', tempKey);
      onClose();
    } catch (err) {
      setError('API Key 验证失败，请检查是否正确');
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-sidebar-bg rounded-2xl p-6 w-full max-w-md animate-fade-in-up border border-card-bg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sensenova-blue to-deepseek-purple flex items-center justify-center">
              <Key size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">配置 API Key</h2>
              <p className="text-xs text-text-muted">访问 SenseNova API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-bg rounded-lg transition-colors"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              API Key
            </label>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => {
                setTempKey(e.target.value);
                setError('');
              }}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="w-full bg-deep-bg border border-card-bg rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-sensenova-blue/50 transition-all"
            />
            {error && (
              <div className="mt-2 flex items-center gap-2 text-error-red text-sm">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          <div className="bg-card-bg rounded-lg p-4">
            <h3 className="text-sm font-medium text-text-primary mb-2">
              如何获取 API Key？
            </h3>
            <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside">
              <li>访问 SenseNova 平台</li>
              <li>完成手机号注册和验证</li>
              <li>在控制台 → API Keys 创建密钥</li>
              <li>复制以 sk- 开头的密钥</li>
            </ol>
          </div>

          <button
            onClick={handleSave}
            disabled={isValidating || !tempKey.trim()}
            className="w-full py-3 bg-gradient-to-r from-sensenova-blue to-blue-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                验证中...
              </>
            ) : (
              '保存并验证'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
