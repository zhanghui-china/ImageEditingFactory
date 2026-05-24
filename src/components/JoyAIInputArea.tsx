import { useState, useRef, useCallback } from 'react';
import { Send, Loader2, X, Palette, Upload, Sparkles, Eye, Move } from 'lucide-react';
import { useStore } from '../store';
import {
  joyAITextToImage,
  joyAIEditImage,
  joyAIUnderstandImage,
  joyAISpatialTransform,
  joyAIUploadImages,
} from '../services/api';
import { saveHistory } from '../services/historyApi';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function JoyAIInputArea() {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = useStore((state) => state.config);
  const isLoading = useStore((state) => state.isLoading);
  const currentModel = useStore((state) => state.currentModel);
  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const addMessage = useStore((state) => state.addMessage);
  const updateConfig = useStore((state) => state.updateConfig);

  const joyaiMode = config.joyaiMode;

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles).filter((file) => file.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...newFiles]);

    // Create previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && joyaiMode !== 'spatial-transform') return;
    if (joyaiMode !== 'text-to-image' && files.length === 0) return;
    if (isLoading) return;

    const startTime = Date.now();
    const requestTime = new Date().toISOString();
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      images: imagePreviews.length > 0 ? imagePreviews : undefined,
      timestamp: Date.now(),
      model: currentModel,
    };

    addMessage(userMessage);
    setLoading(true);
    const currentInput = input;
    const currentFiles = [...files];
    setInput('');

    if (joyaiMode === 'text-to-image') {
      joyAITextToImage({
        prompt: input,
        steps: config.joyaiSteps,
        guidanceScale: config.joyaiGuidanceScale,
        basesize: config.joyaiBasesize,
        onComplete: async (imageUrl) => {
          const duration = Date.now() - startTime;
          const responseTime = new Date().toISOString();
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: '',
            images: [imageUrl],
            timestamp: Date.now(),
            model: currentModel,
            duration: duration,
          };
          addMessage(assistantMessage);
          setLoading(false);
          const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
          saveHistory({
            model: currentModel,
            generate_type: joyaiMode,
            prompt: currentInput,
            request_images: requestImagesBase64,
            response_result: 'success',
            response_images: [imageUrl],
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
          const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
          saveHistory({
            model: currentModel,
            generate_type: joyaiMode,
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
    } else if (joyaiMode === 'edit-image') {
      joyAIUploadImages({
        files: currentFiles,
        onComplete: async (uploadedImageUrls) => {
          joyAIEditImage({
            prompt: currentInput,
            imagePath: uploadedImageUrls[0],
            strength: config.joyaiStrength,
            steps: config.joyaiSteps,
            guidanceScale: config.joyaiGuidanceScale,
            basesize: config.joyaiBasesize,
            onComplete: async (imageUrl) => {
              const duration = Date.now() - startTime;
              const responseTime = new Date().toISOString();
              const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: '',
                images: [imageUrl],
                timestamp: Date.now(),
                model: currentModel,
                duration: duration,
              };
              addMessage(assistantMessage);
              setLoading(false);
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
                prompt: currentInput,
                request_images: requestImagesBase64,
                response_result: 'success',
                response_images: [imageUrl],
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
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
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
        },
        onError: async (error) => {
          const duration = Date.now() - startTime;
          const responseTime = new Date().toISOString();
          setError(error);
          setLoading(false);
          setFiles([]);
          setImagePreviews([]);
          const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
          saveHistory({
            model: currentModel,
            generate_type: joyaiMode,
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
    } else if (joyaiMode === 'understand-image') {
      joyAIUploadImages({
        files: currentFiles,
        onComplete: async (uploadedImageUrls) => {
          joyAIUnderstandImage({
            imagePath: uploadedImageUrls[0],
            question: currentInput || '描述这张图片的内容',
            onComplete: async (description) => {
              const duration = Date.now() - startTime;
              const responseTime = new Date().toISOString();
              const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: description,
                images: uploadedImageUrls,
                timestamp: Date.now(),
                model: currentModel,
                duration: duration,
              };
              addMessage(assistantMessage);
              setLoading(false);
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
                prompt: currentInput || '描述这张图片的内容',
                request_images: requestImagesBase64,
                response_result: description,
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
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
                prompt: currentInput || '描述这张图片的内容',
                request_images: requestImagesBase64,
                response_result: error,
                response_images: [],
                request_time: requestTime,
                response_time: responseTime,
                duration_ms: duration,
              }).catch(err => console.error('Failed to save history:', err));
            },
          });
        },
        onError: async (error) => {
          const duration = Date.now() - startTime;
          const responseTime = new Date().toISOString();
          setError(error);
          setLoading(false);
          setFiles([]);
          setImagePreviews([]);
          const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
          saveHistory({
            model: currentModel,
            generate_type: joyaiMode,
            prompt: currentInput || '描述这张图片的内容',
            request_images: requestImagesBase64,
            response_result: error,
            response_images: [],
            request_time: requestTime,
            response_time: responseTime,
            duration_ms: duration,
          }).catch(err => console.error('Failed to save history:', err));
        },
      });
    } else if (joyaiMode === 'spatial-transform') {
      joyAIUploadImages({
        files: currentFiles,
        onComplete: async (uploadedImageUrls) => {
          joyAISpatialTransform({
            imagePath: uploadedImageUrls[0],
            operationType: config.joyaiOperationType,
            objectPrompt: config.joyaiObjectPrompt,
            moveDx: config.joyaiMoveDx,
            moveDy: config.joyaiMoveDy,
            rotateAngle: config.joyaiRotateAngle,
            zoomFactor: config.joyaiZoomFactor,
            panAngle: config.joyaiPanAngle,
            tiltAngle: config.joyaiTiltAngle,
            steps: config.joyaiSteps,
            guidanceScale: config.joyaiGuidanceScale,
            basesize: config.joyaiBasesize,
            onComplete: async (imageUrl) => {
              const duration = Date.now() - startTime;
              const responseTime = new Date().toISOString();
              const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: '',
                images: [imageUrl],
                timestamp: Date.now(),
                model: currentModel,
                duration: duration,
              };
              addMessage(assistantMessage);
              setLoading(false);
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
                prompt: currentInput,
                request_images: requestImagesBase64,
                response_result: 'success',
                response_images: [imageUrl],
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
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
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
        },
        onError: async (error) => {
          const duration = Date.now() - startTime;
          const responseTime = new Date().toISOString();
          setError(error);
          setLoading(false);
          setFiles([]);
          setImagePreviews([]);
          const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
          saveHistory({
            model: currentModel,
            generate_type: joyaiMode,
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
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="border-t border-card-bg bg-sidebar-bg p-4">
      <div className="max-w-4xl mx-auto">
        {/* Mode Selector */}
        <div className="flex flex-wrap mb-4 bg-deep-bg rounded-lg p-1 gap-1">
          <button
            onClick={() => updateConfig({ ...config, joyaiMode: 'text-to-image' })}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-md text-xs font-medium transition-all ${
              joyaiMode === 'text-to-image'
                ? 'bg-pink-500/20 text-pink-400'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Palette size={14} />
              文生图
            </div>
          </button>
          <button
            onClick={() => updateConfig({ ...config, joyaiMode: 'edit-image' })}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-md text-xs font-medium transition-all ${
              joyaiMode === 'edit-image'
                ? 'bg-pink-500/20 text-pink-400'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles size={14} />
              图像编辑
            </div>
          </button>
          <button
            onClick={() => updateConfig({ ...config, joyaiMode: 'understand-image' })}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-md text-xs font-medium transition-all ${
              joyaiMode === 'understand-image'
                ? 'bg-pink-500/20 text-pink-400'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Eye size={14} />
              图像理解
            </div>
          </button>
          <button
            onClick={() => updateConfig({ ...config, joyaiMode: 'spatial-transform' })}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-md text-xs font-medium transition-all ${
              joyaiMode === 'spatial-transform'
                ? 'bg-pink-500/20 text-pink-400'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Move size={14} />
              空间变换
            </div>
          </button>
        </div>

        {/* Image Preview Section */}
        {joyaiMode !== 'text-to-image' && (
          <div className="mb-4">
            {imagePreviews.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img
                      src={img}
                      alt={`Upload ${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-error-red text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                  isDragging
                    ? 'border-pink-500 bg-pink-500/10'
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
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-text-secondary hover:text-pink-400 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Upload size={20} />
                  <span>点击上传或拖拽图片到此处</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                joyaiMode === 'text-to-image'
                  ? '描述你想要生成的图片...'
                  : joyaiMode === 'edit-image'
                  ? '描述你想要如何编辑图片...'
                  : joyaiMode === 'understand-image'
                  ? '问任何关于这张图片的问题...'
                  : '选择空间变换类型（可选输入描述）'
              }
              className="w-full bg-deep-bg border border-card-bg rounded-xl px-4 py-3 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none transition-all"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={
              isLoading ||
              (joyaiMode !== 'spatial-transform' && !input.trim()) ||
              (joyaiMode !== 'text-to-image' && files.length === 0)
            }
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
