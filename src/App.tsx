import { useEffect, useState } from 'react';
import { useStore } from './store';
import ModelSelector from './components/ModelSelector';
import ChatInterface from './components/ChatInterface';
import InputArea from './components/InputArea';
import FluxInputArea from './components/FluxInputArea';
import JoyAIInputArea from './components/JoyAIInputArea';
import SettingsPanel from './components/SettingsPanel';
import ImagePreviewModal from './components/ImagePreviewModal';
import { AlertCircle } from 'lucide-react';

function App() {
  const getApiKey = useStore((state) => state.getApiKey);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const getCurrentMessages = useStore((state) => state.getCurrentMessages);
  const currentModel = useStore((state) => state.currentModel);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);

  const messages = getCurrentMessages();
  const isFluxKlein = currentModel === 'flux-klein';
  const isJoyAI = currentModel === 'joyai-image-edit';
  const apiKey = getApiKey();

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.images && lastMessage.images.length > 0) {
      setPreviewImages(lastMessage.images);
    }
  }, [messages]);

  const openPreview = () => {
    if (previewImages.length > 0) {
      setIsPreviewOpen(true);
    }
  };

  const handlePreviewImages = (images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewStartIndex(index);
    setIsPreviewOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-deep-bg text-text-primary font-sans">
      <header className="flex-shrink-0 bg-sidebar-bg border-b border-card-bg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sensenova-blue via-deepseek-purple to-u1-orange flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" ry="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-sensenova-blue via-deepseek-purple to-u1-orange bg-clip-text text-transparent">
                多模型AI平台
              </h1>
              <p className="text-xs text-text-muted">
                集成多个顶级 AI 模型
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              apiKey
                ? 'bg-success-green/20 text-success-green'
                : 'bg-error-red/20 text-error-red'
            }`}
          >
            {apiKey ? (
              <>
                <div className="w-2 h-2 rounded-full bg-success-green" />
                <span className="text-sm hidden sm:inline">API Key 已配置</span>
              </>
            ) : (
              <>
                <span className="text-sm">请在 .env 文件中配置 VITE_SENSENOVA_API_KEY</span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 flex-shrink-0 bg-sidebar-bg border-r border-card-bg flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <ModelSelector />
          </div>
          <SettingsPanel />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface onPreviewImages={handlePreviewImages} />

          {previewImages.length > 0 && (
            <div className="px-6 pb-2">
              <button
                onClick={openPreview}
                className="flex items-center gap-2 px-4 py-2 bg-u1-orange/20 text-u1-orange rounded-lg hover:bg-u1-orange/30 transition-colors text-sm"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                查看生成的图片 ({previewImages.length})
              </button>
            </div>
          )}

          {isFluxKlein ? <FluxInputArea /> : isJoyAI ? <JoyAIInputArea /> : <InputArea />}
        </main>
      </div>

      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-error-red/90 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in-up z-40">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 hover:bg-white/20 p-1 rounded"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}

      <ImagePreviewModal
        images={previewImages}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        startIndex={previewStartIndex}
      />
    </div>
  );
}

export default App;
