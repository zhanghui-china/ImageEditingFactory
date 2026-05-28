import { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { hiDreamTextToImage, hiDreamEditImage, hiDreamSubjectDriven } from '../services/api';
import { saveHistory } from '../services/historyApi';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const urlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('urlToBase64 error:', error);
        resolve(url); // 如果失败，还是用原来的url
      });
  });
};

export default function HiDreamInputArea() {
  const { config, updateConfig, isLoading, setLoading, addMessage } = useStore();
  const [input, setInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...uploadedImages, ...files].slice(0, 5);
    const newPreviews = files.map(file => URL.createObjectURL(file));

    setUploadedImages(newFiles);
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!input.trim() && config.hidreamMode === 'text-to-image') {
      return;
    }
    if (config.hidreamMode !== 'text-to-image' && uploadedImages.length === 0) {
      return;
    }

    const startTime = Date.now();
    const requestTime = new Date().toISOString();
    setLoading(true);
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      model: 'hidream-o1-image',
    });

    try {
      let imageUrl: string;

      console.log('[HiDreamInputArea] Starting generation');
      
      if (config.hidreamMode === 'text-to-image') {
        imageUrl = await hiDreamTextToImage({
          prompt: input,
          width: config.hidreamWidth,
          height: config.hidreamHeight,
          seed: config.hidreamSteps,
        });
      } else if (config.hidreamMode === 'edit-image' && uploadedImages[0]) {
        imageUrl = await hiDreamEditImage({
          prompt: input,
          image: uploadedImages[0],
          width: config.hidreamWidth,
          height: config.hidreamHeight,
          keepAspect: config.hidreamKeepAspect,
          scheduler: config.hidreamScheduler,
        });
      } else if (config.hidreamMode === 'subject-driven' && uploadedImages.length > 0) {
        imageUrl = await hiDreamSubjectDriven({
          prompt: input,
          referenceImages: uploadedImages,
          width: config.hidreamWidth,
          height: config.hidreamHeight,
          keepAspect: config.hidreamKeepAspect,
          scheduler: config.hidreamScheduler,
        });
      } else {
        throw new Error('Invalid mode or no image');
      }

      console.log('[HiDreamInputArea] Generation complete, adding message');
      const duration = Date.now() - startTime;
      const responseTime = new Date().toISOString();
      
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        images: [imageUrl!],
        timestamp: Date.now(),
        model: 'hidream-o1-image',
        duration: duration,
      });
      
      console.log('[HiDreamInputArea] Setting loading to false');
      setLoading(false);
      const savedInput = input;
      const savedImages = [...uploadedImages];
      setInput('');
      setUploadedImages([]);
      setPreviewUrls([]);
      console.log('[HiDreamInputArea] Done');

      const requestImagesBase64 = await Promise.all(savedImages.map(fileToBase64));
      
      // 转换为base64保存
      let savedImageUrl = imageUrl;
      try {
        // 只要不是 data URL 格式，都尝试转换为 base64
        if (!imageUrl.startsWith('data:')) {
          savedImageUrl = await urlToBase64(imageUrl);
        }
      } catch (convertError) {
        console.error('Failed to convert URL to base64:', convertError);
      }

      console.log('[HiDream] Saving history...', {
        model: 'hidream-o1-image',
        generate_type: config.hidreamMode,
        prompt: savedInput,
        requestImagesCount: requestImagesBase64.length,
        responseImagesCount: 1,
      });
      saveHistory({
        model: 'hidream-o1-image',
        generate_type: config.hidreamMode,
        prompt: savedInput,
        request_images: requestImagesBase64,
        response_result: 'success',
        response_images: [savedImageUrl],
        request_time: requestTime,
        response_time: responseTime,
        duration_ms: duration,
      }).then(id => {
        console.log('[HiDream] History saved with ID:', id);
      }).catch(err => {
        console.error('[HiDream] Failed to save history:', err);
      });
      
    } catch (error) {
      console.error('[HiDreamInputArea] Error:', error);
      const duration = Date.now() - startTime;
      const responseTime = new Date().toISOString();
      
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
        model: 'hidream-o1-image',
      });
      setLoading(false);
      const savedInput = input;
      const savedImages = [...uploadedImages];
      setInput('');
      setUploadedImages([]);
      setPreviewUrls([]);

      const requestImagesBase64 = await Promise.all(savedImages.map(fileToBase64));
      console.log('[HiDream] Saving error history...', {
        model: 'hidream-o1-image',
        generate_type: config.hidreamMode,
        prompt: savedInput,
        error: error instanceof Error ? error.message : '未知错误',
      });
      saveHistory({
        model: 'hidream-o1-image',
        generate_type: config.hidreamMode,
        prompt: savedInput,
        request_images: requestImagesBase64,
        response_result: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        response_images: [],
        request_time: requestTime,
        response_time: responseTime,
        duration_ms: duration,
      }).then(id => {
        console.log('[HiDream] Error history saved with ID:', id);
      }).catch(err => {
        console.error('[HiDream] Failed to save error history:', err);
      });
    }
  };

  return (
    <div className="border-t border-card-bg bg-sidebar-bg p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex flex-wrap mb-4 bg-deep-bg rounded-lg p-1 gap-1">
          {(['text-to-image', 'edit-image', 'subject-driven'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateConfig({ hidreamMode: mode })}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-md text-xs font-medium transition-all ${
                config.hidreamMode === mode
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {mode === 'text-to-image' && '文生图'}
              {mode === 'edit-image' && '图像编辑'}
              {mode === 'subject-driven' && '主体驱动'}
            </button>
          ))}
        </div>

        {config.hidreamMode !== 'text-to-image' && (
          <div className="mb-4">
            {previewUrls.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Preview ${index}`}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-card-bg rounded-lg p-4 text-center transition-all hover:border-cyan-500 cursor-pointer"
              >
                <ImageIcon size={24} className="text-text-muted mx-auto mb-2" />
                <span className="text-sm text-text-muted">
                  {config.hidreamMode === 'subject-driven' ? '点击上传参考图像 (最多5张)' : '点击上传参考图像'}
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFileSelect}
            />
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                config.hidreamMode === 'text-to-image'
                  ? '描述你想要的图像...'
                  : config.hidreamMode === 'edit-image'
                  ? '描述你想要编辑的内容...'
                  : '描述你想要的新场景...'
              }
              className="w-full bg-deep-bg border border-card-bg rounded-xl px-4 py-3 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none transition-all"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !input.trim() ||
              (config.hidreamMode !== 'text-to-image' && uploadedImages.length === 0)
            }
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="hidden sm:inline">{isLoading ? '生成中...' : '生成'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
