import { useStore } from '../store';
import MessageBubble from './MessageBubble';
import { Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  onPreviewImages?: (images: string[], index: number) => void;
}

export default function ChatInterface({ onPreviewImages }: ChatInterfaceProps) {
  const messages = useStore((state) => state.getCurrentMessages());
  const isLoading = useStore((state) => state.isLoading);
  const currentModel = useStore((state) => state.currentModel);
  const config = useStore((state) => state.config);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sensenova-blue to-deepseek-purple flex items-center justify-center mb-6">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              开始与 AI 对话
            </h2>
            <p className="text-text-secondary max-w-md">
              {currentModel === 'sensenova-6.7-flash-lite' && (
                <>
                  SenseNova 6.7 Flash-Lite 支持文本对话和图像理解。尝试上传一张图片或直接输入问题。
                </>
              )}
              {currentModel === 'deepseek-v4-flash' && (
                <>
                  DeepSeek V4 Flash 支持深度思考模式，可以为你提供更详细的推理过程。
                </>
              )}
              {currentModel === 'sensenova-u1-fast' && (
                <>
                  SenseNova U1 Fast 专门用于生成专业的信息图。描述你想要的可视化内容，即可生成精美的图表。
                </>
              )}
              {currentModel === 'flux-klein' && (
                <>
                  FLUX.2 Klein 9B 是本地部署的文生图模型。输入文字描述，即可通过本地 GPU 快速生成高质量图片。
                </>
              )}
              {currentModel === 'joyai-image-edit' && (
                <>
                  JoyAI Image Edit 支持图像理解、文生图、图像编辑和空间变换（物体移动/旋转、镜头控制）。
                  {config.joyaiMode === 'text-to-image' && ' 当前模式：文生图'}
                  {config.joyaiMode === 'edit-image' && ' 当前模式：图像编辑'}
                  {config.joyaiMode === 'understand-image' && ' 当前模式：图像理解'}
                  {config.joyaiMode === 'spatial-transform' && ' 当前模式：空间变换'}
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onPreviewImages={onPreviewImages}
              />
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-fade-in-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-card-bg flex items-center justify-center">
                  <Loader2 size={16} className="text-sensenova-blue animate-spin" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-card-bg">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-sm">
                      {currentModel === 'joyai-image-edit' ? '处理中...' : '思考中...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
