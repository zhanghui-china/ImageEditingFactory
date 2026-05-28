import { useState, useRef, useCallback } from 'react';
import { Send, Image, Loader2, X } from 'lucide-react';
import { useStore } from '../store';
import { sendChatMessage, generateImage } from '../services/api';
import { saveHistory } from '../services/historyApi';

const urlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }
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
        resolve(url);
      });
  });
};

export default function InputArea() {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getApiKey = useStore((state) => state.getApiKey);
  const currentModel = useStore((state) => state.currentModel);
  const messages = useStore((state) => state.getCurrentMessages());
  const config = useStore((state) => state.config);
  const isLoading = useStore((state) => state.isLoading);
  const addMessage = useStore((state) => state.addMessage);
  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const updateStreamingMessage = useStore((state) => state.updateStreamingMessage);

  const supportsImages = currentModel === 'sensenova-6.7-flash-lite';
  const isU1Fast = currentModel === 'sensenova-u1-fast';

    const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setImages((prev) => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && images.length === 0) return;
    if (isLoading) return;

    const apiKey = getApiKey();
    if (!apiKey && !isU1Fast) {
      setError('请先配置 API Key（在 .env 文件中设置 VITE_SENSENOVA_API_KEY）');
      return;
    }

    const startTime = Date.now();
    const requestTime = new Date().toISOString();
    const currentInput = input;
    const currentImages = [...images];
    const currentModelName = currentModel;

    if (isU1Fast) {
      if (!input.trim()) return;

      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: input,
        timestamp: Date.now(),
        model: currentModel,
      };

      addMessage(userMessage);
      setLoading(true);
      setInput('');
      setImages([]);

      generateImage({
        apiKey,
        prompt: input,
        size: config.imageSize,
        n: config.imageCount,
        onComplete: async (generatedImages) => {
          const duration = Date.now() - startTime;
          const responseTime = new Date().toISOString();
          
          // 转换为base64保存
          const savedImages = await Promise.all(
            generatedImages.map(url => urlToBase64(url))
          );

          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: '',
            images: savedImages,
            timestamp: Date.now(),
            model: currentModel,
            duration: duration,
          };
          addMessage(assistantMessage);
          setLoading(false);
          saveHistory({
            model: currentModelName,
            generate_type: 'text-to-image',
            prompt: currentInput,
            request_images: currentImages,
            response_result: 'success',
            response_images: savedImages,
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
            model: currentModelName,
            generate_type: 'text-to-image',
            prompt: currentInput,
            request_images: currentImages,
            response_result: error,
            response_images: [],
            request_time: requestTime,
            response_time: responseTime,
            duration_ms: duration,
          }).catch(err => console.error('Failed to save history:', err));
        },
      });
    } else {
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: input,
        images: currentImages.length > 0 ? currentImages : undefined,
        timestamp: Date.now(),
        model: currentModel,
      };

      addMessage(userMessage);
      setLoading(true);
      setInput('');
      setImages([]);

      const newMessages = [...messages, userMessage];

      const assistantMessageId = (Date.now() + 1).toString();
      const emptyAssistantMessage = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: '',
        reasoningContent: '',
        timestamp: Date.now(),
        model: currentModel,
      };
      addMessage(emptyAssistantMessage);

      sendChatMessage({
        apiKey,
        model: currentModel,
        messages: newMessages,
        config,
        onChunk: (content, reasoning) => {
          updateStreamingMessage(content, reasoning);
        },
        onComplete: async () => {
          const duration = Date.now() - startTime;
          const responseTime = new Date().toISOString();
          const currentMessages = useStore.getState().getCurrentMessages();
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            useStore.setState({
              messagesByModel: {
                ...useStore.getState().messagesByModel,
                [currentModel]: currentMessages.map((msg, idx) => 
                  idx === currentMessages.length - 1 
                    ? { ...msg, duration }
                    : msg
                ),
              },
            });
          }
          setLoading(false);
          const assistantContent = lastMessage?.content || '';
          saveHistory({
            model: currentModelName,
            generate_type: 'chat',
            prompt: currentInput,
            request_images: currentImages,
            response_result: assistantContent,
            response_images: [],
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
            model: currentModelName,
            generate_type: 'chat',
            prompt: currentInput,
            request_images: currentImages,
            response_result: error,
            response_images: [],
            request_time: requestTime,
            response_time: responseTime,
            duration_ms: duration,
          }).catch(err => console.error('Failed to save history:', err));
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (supportsImages) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="border-t border-card-bg bg-sidebar-bg p-4">
      <div className="max-w-4xl mx-auto">
        {images.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                <img
                  src={img}
                  alt={`Upload ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-error-red text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {supportsImages && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mb-3 border-2 border-dashed rounded-lg p-3 text-center transition-all ${
              isDragging
                ? 'border-sensenova-blue bg-sensenova-blue/10'
                : 'border-card-bg hover:border-text-muted'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-text-secondary hover:text-sensenova-blue transition-colors flex items-center gap-2 mx-auto"
            >
              <Image size={16} />
              <span className="text-sm">
                拖拽图片到此处或点击上传
              </span>
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isU1Fast
                  ? '描述你想要的信息图内容...'
                  : '输入消息，按 Enter 发送...'
              }
              className="w-full bg-deep-bg border border-card-bg rounded-xl px-4 py-3 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-sensenova-blue/50 resize-none transition-all"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && images.length === 0)}
            className="px-6 py-3 bg-gradient-to-r from-sensenova-blue to-blue-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="hidden sm:inline">发送</span>
          </button>
        </div>
      </div>
    </div>
  );
}
