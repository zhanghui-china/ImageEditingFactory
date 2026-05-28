import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, X, Palette, Upload, Sparkles, Eye, Move, StopCircle } from 'lucide-react';
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

export default function JoyAIInputArea() {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = useStore((state) => state.config);
  const isLoading = useStore((state) => state.isLoading);
  const currentModel = useStore((state) => state.currentModel);
  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const addMessage = useStore((state) => state.addMessage);
  const updateConfig = useStore((state) => state.updateConfig);
  const setAbortController = useStore((state) => state.setAbortController);
  const cancelRequest = useStore((state) => state.cancelRequest);

  const joyaiMode = config.joyaiMode;

  const generatePromptTemplate = () => {
    if (config.joyaiSpatialMode === 'object-move') {
      const object = config.joyaiObjectPrompt || 'object';
      return `Move the ${object} into the red box and finally remove the red box.`;
    } else if (config.joyaiSpatialMode === 'object-rotate') {
      const object = config.joyaiObjectPrompt || 'object';
      const viewMap: Record<string, string> = {
        'front': 'front',
        'right': 'right',
        'left': 'left',
        'rear': 'rear',
        'front-right': 'front right',
        'front-left': 'front left',
        'rear-right': 'rear right',
        'rear-left': 'rear left',
      };
      const view = viewMap[config.joyaiRotateView] || 'front';
      return `Rotate the ${object} to show the ${view} side view.`;
    } else if (config.joyaiSpatialMode === 'camera-control') {
      const yaw = config.joyaiCameraYaw;
      const pitch = config.joyaiCameraPitch;
      const zoom = config.joyaiCameraZoom;
      return `Move the camera.\n- Camera rotation: Yaw ${yaw}°, Pitch ${pitch}°.\n- Camera zoom: ${zoom}.\n- Keep the 3D scene static; only change the viewpoint.`;
    }
    return '';
  };

  // 当配置变化时自动更新输入框
  useEffect(() => {
    if (joyaiMode === 'spatial-transform') {
      const template = generatePromptTemplate();
      if (!userHasEdited) {
        setInput(template);
      }
    }
  }, [
    joyaiMode,
    config.joyaiSpatialMode,
    config.joyaiObjectPrompt,
    config.joyaiRotateView,
    config.joyaiCameraYaw,
    config.joyaiCameraPitch,
    config.joyaiCameraZoom,
    userHasEdited
  ]);

  // 当切换模式时重置编辑状态
  useEffect(() => {
    if (joyaiMode !== 'spatial-transform') {
      setUserHasEdited(false);
    }
  }, [joyaiMode]);

  const getDefaultPrompt = () => {
    if (!input.trim() && joyaiMode === 'spatial-transform') {
      return generatePromptTemplate();
    }
    return input;
  };

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
    const promptToUse = getDefaultPrompt();
    if (!promptToUse.trim() && joyaiMode !== 'spatial-transform') return;
    if (joyaiMode !== 'text-to-image' && files.length === 0) return;
    if (isLoading) return;

    const abortController = new AbortController();
    setAbortController(abortController);

    const startTime = Date.now();
    const requestTime = new Date().toISOString();
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: promptToUse,
      images: imagePreviews.length > 0 ? imagePreviews : undefined,
      timestamp: Date.now(),
      model: currentModel,
    };

    addMessage(userMessage);
    setLoading(true);
    const currentInput = promptToUse;
    const currentFiles = [...files];
    setInput('');
    setUserHasEdited(false);

    if (joyaiMode === 'text-to-image') {
      joyAITextToImage({
        prompt: promptToUse,
        steps: config.joyaiSteps,
        guidanceScale: config.joyaiGuidanceScale,
        height: config.joyaiHeight,
        width: config.joyaiWidth,
        signal: abortController.signal,
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
          setAbortController(null);
          const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
          saveHistory({
            model: currentModel,
            generate_type: joyaiMode,
            prompt: currentInput,
            request_images: requestImagesBase64,
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
          // 忽略 AbortError
          if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
            setError(error);
          }
          setLoading(false);
          setAbortController(null);
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
        signal: abortController.signal,
        onComplete: async (uploadedImageUrls) => {
          joyAIEditImage({
            prompt: promptToUse,
            imagePath: uploadedImageUrls[0],
            steps: config.joyaiSteps,
            guidanceScale: config.joyaiGuidanceScale,
            signal: abortController.signal,
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
              setAbortController(null);
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
                prompt: currentInput,
                request_images: requestImagesBase64,
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
              // 忽略 AbortError
              if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
                setError(error);
              }
              setLoading(false);
              setAbortController(null);
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
          // 忽略 AbortError
          if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
            setError(error);
          }
          setLoading(false);
          setAbortController(null);
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
        signal: abortController.signal,
        onComplete: async (uploadedImageUrls) => {
          joyAIUnderstandImage({
            imagePaths: uploadedImageUrls,
            question: promptToUse || '描述这张图片的内容',
            signal: abortController.signal,
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
              setAbortController(null);
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
              // 忽略 AbortError
              if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
                setError(error);
              }
              setLoading(false);
              setAbortController(null);
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
          // 忽略 AbortError
          if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
            setError(error);
          }
          setLoading(false);
          setAbortController(null);
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
        signal: abortController.signal,
        onComplete: async (uploadedImageUrls) => {
          joyAISpatialTransform({
            imagePath: uploadedImageUrls[0],
            prompt: promptToUse,
            steps: config.joyaiSteps,
            guidanceScale: config.joyaiGuidanceScale,
            signal: abortController.signal,
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
              setAbortController(null);
              setFiles([]);
              setImagePreviews([]);
              const requestImagesBase64 = await Promise.all(currentFiles.map(fileToBase64));
              saveHistory({
                model: currentModel,
                generate_type: joyaiMode,
                prompt: currentInput,
                request_images: requestImagesBase64,
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
              // 忽略 AbortError
              if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
                setError(error);
              }
              setLoading(false);
              setAbortController(null);
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
          // 忽略 AbortError
          if (error !== '请求已取消' && !(error instanceof Error && error.name === 'AbortError')) {
            setError(error);
          }
          setLoading(false);
          setAbortController(null);
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
                      onClick={() => removeFile(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-error-red text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Area - always visible */}
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
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setUserHasEdited(true);
              }}
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
              rows={
                joyaiMode === 'spatial-transform' 
                  ? (config.joyaiSpatialMode === 'camera-control' ? 4 : 2) 
                  : 1
              }
              style={{ minHeight: '48px', maxHeight: '150px' }}
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
              disabled={
                (joyaiMode !== 'spatial-transform' && !input.trim() && !input.trim()) ||
                (joyaiMode !== 'text-to-image' && files.length === 0)
              }
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">生成</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
