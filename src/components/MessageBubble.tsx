import { Message } from '../types';
import { Bot, User, Download, ZoomIn, Clock } from 'lucide-react';
import { useStore } from '../store';
import { formatDuration } from '../utils/formatDuration';

interface MessageBubbleProps {
  message: Message;
  onPreviewImages?: (images: string[], index: number) => void;
}

export default function MessageBubble({ message, onPreviewImages }: MessageBubbleProps) {
  const { currentModel } = useStore();
  const isUser = message.role === 'user';

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `image-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  return (
    <div
      className={`flex gap-3 animate-fade-in-up ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser ? 'bg-sensenova-blue' : 'bg-card-bg'
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot
            size={16}
            className={
              currentModel === 'deepseek-v4-flash'
                ? 'text-deepseek-purple'
                : currentModel === 'qwen3.5-9b'
                ? 'text-orange-500'
                : currentModel === 'sensenova-u1-fast'
                ? 'text-u1-orange'
                : 'text-sensenova-blue'
            }
          />
        )}
      </div>

      <div
        className={`flex-1 max-w-[75%] ${
          isUser ? 'items-end' : 'items-start'
        } flex flex-col gap-1`}
      >
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-sensenova-blue to-blue-600 text-white rounded-br-md'
              : 'bg-card-bg text-text-primary rounded-bl-md'
          }`}
        >
          {message.reasoningContent && (currentModel === 'deepseek-v4-flash' || currentModel === 'qwen3.5-9b') && (
            <div className="mb-3 p-3 bg-deep-bg rounded-lg border-l-4 border-deepseek-purple">
              <div className="text-xs text-deepseek-purple font-medium mb-1 flex items-center gap-1">
                <Sparkles size={12} />
                思考过程
              </div>
              <div className="text-xs text-text-muted italic leading-relaxed">
                {message.reasoningContent}
              </div>
            </div>
          )}

          {message.content && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}

          {message.images && message.images.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {message.images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`Image ${idx + 1}`}
                    className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onPreviewImages?.(message.images!, idx)}
                  />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewImages?.(message.images!, idx);
                      }}
                      className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img);
                      }}
                      className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {message.tokens && (
          <div className="text-xs text-text-muted px-1">
            Tokens: {message.tokens.total}
          </div>
        )}
        
        {message.duration && !isUser && (
          <div className="text-xs text-text-muted px-1 flex items-center gap-1">
            <Clock size={12} />
            <span>耗时: {formatDuration(message.duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkles({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
