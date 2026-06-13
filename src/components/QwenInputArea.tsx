import { useState, useRef, useCallback } from 'react';
import { Send, Loader2, Image as ImageIcon, X, Upload, StopCircle } from 'lucide-react';
import { useStore } from '../store';
import { qwenEditImage } from '../services/api';
import { saveHistory } from '../services/historyApi';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function QwenInputArea() {
  const [input, setInput] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = useStore((state) => state.config);
  const isLoading = useStore((state) => state.isLoading);
  const currentModel = useStore((state) => state.currentModel);
  const addMessage = useStore((state) => state.addMessage);
  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const setAbortController = useStore((state) => state.setAbortController);
  const cancelRequest = useStore((state) => state.cancelRequest);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles).filter((file) => file.type.startsWith('image/'));
    setImageFiles((prev) => [...prev, ...newFiles]);

    // Create previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (imageFiles.length === 0) {
      setError('请先选择要编辑的图片');
      return;
    }
    if (isLoading) return;

    const abortController = new AbortController();
    setAbortController(abortController);

    const startTime = Date.now();
    const requestTime = new Date().toISOString();
    const requestImagesBase64 = await Promise.all(imageFiles.map(fileToBase64));
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      images: requestImagesBase64,
      timestamp: Date.now(),
      model: currentModel,
    };

    addMessage(userMessage);
    setLoading(true);
    const currentInput = input;
    const currentFiles = [...imageFiles];
    setInput('');
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    qwenEditImage({
      prompt: input,
      images: currentFiles,
      numInferenceSteps: config.qwenSteps,
      guidanceScale: config.qwenGuidanceScale,
      trueCfgScale: config.qwenTrueCfgScale,
      seed: config.qwenSeed,
      signal: abortController.signal,
      onComplete: async (imageUrls) => {
        const duration = Date.now() - startTime;
        const responseTime = new Date().toISOString();

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: '',
          images: imageUrls,
          timestamp: Date.now(),
          model: currentModel,
          duration: duration,
        };
        addMessage(assistantMessage);
        setLoading(false);
        setAbortController(null);
        saveHistory({
          model: currentModel,
          generate_type: 'edit-image',
          prompt: currentInput,
          request_images: requestImagesBase64,
          response_result: 'success',
          response_images: imageUrls,
          request_time: requestTime,
          response_time: responseTime,
          duration_ms: duration,
        }).catch(err => console.error('Failed to save history:', err));
      },
      onError: async (error) => {
        const duration = Date.now() - startTime;
        const responseTime = new Date().toISOString();
        // 忽略 AbortError
        if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
          setError(error);
        }
        setLoading(false);
        setAbortController(null);
        saveHistory({
          model: currentModel,
          generate_type: 'edit-image',
          prompt: currentInput,
          request_images: requestImagesBase64,
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
        {/* Image Preview Section */}
        <div className="mb-4">
          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {imagePreviews.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img
                    src={img}
                    alt={`Upload ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Upload Area - always visible */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
              isDragging
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-card-bg hover:border-text-muted'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="text-text-secondary hover:text-orange-400 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={20} />
              <span>点击上传或拖拽图片到此处（支持多张）</span>
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要如何编辑这些图片..."
              className="w-full bg-deep-bg border border-card-bg rounded-xl px-4 py-3 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-all"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>

          {isLoading ? (
            <button
              onClick={cancelRequest}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
            >
              <StopCircle size={18} />
              <span className="hidden sm:inline">停止</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || imageFiles.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">编辑</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
