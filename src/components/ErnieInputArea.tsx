import { useState, useRef } from 'react';
import { Send, Loader2, Brain } from 'lucide-react';
import { useStore } from '../store';
import { ernieTextToImage } from '../services/api';
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

export default function ErnieInputArea() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = useStore((state) => state.config);
  const isLoading = useStore((state) => state.isLoading);
  const currentModel = useStore((state) => state.currentModel);
  const addMessage = useStore((state) => state.addMessage);
  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (isLoading) return;

    const startTime = Date.now();
    const requestTime = new Date().toISOString();
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
      model: currentModel,
    };

    addMessage(userMessage);
    setLoading(true);
    const currentInput = input;
    setInput('');

    ernieTextToImage({
      prompt: input,
      width: config.ernieWidth,
      height: config.ernieHeight,
      numInferenceSteps: config.ernieSteps,
      guidanceScale: config.ernieGuidanceScale,
      usePe: config.ernieUsePe,
      onComplete: async (imageUrl) => {
        const duration = Date.now() - startTime;
        const responseTime = new Date().toISOString();
        
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

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: '',
          images: [savedImageUrl],
          timestamp: Date.now(),
          model: currentModel,
          duration: duration,
        };
        addMessage(assistantMessage);
        setLoading(false);
        saveHistory({
          model: currentModel,
          generate_type: 'text-to-image',
          prompt: currentInput,
          request_images: [],
          response_result: 'success',
          response_images: [savedImageUrl],
          request_time: requestTime,
          response_time: responseTime,
          duration_ms: duration,
        }).catch(err => console.error('Failed to save history:', err));
      },
      onError: async (error) => {
        const duration = Date.now() - startTime;
        const responseTime = new Date().toISOString();
        setError(error);
        setLoading(false);
        saveHistory({
          model: currentModel,
          generate_type: 'text-to-image',
          prompt: currentInput,
          request_images: [],
          response_result: error,
          response_images: [],
          request_time: requestTime,
          response_time: responseTime,
          duration_ms: duration,
        }).catch(err => console.error('Failed to save history:', err));
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-card-bg bg-sidebar-bg p-4">
      <div className="max-w-4xl mx-auto">
        {/* Input Area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要生成的图片..."
              className="w-full bg-deep-bg border border-card-bg rounded-xl px-4 py-3 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none transition-all"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="hidden sm:inline">生成</span>
          </button>
        </div>
      </div>
    </div>
  );
}
