import { ModelType, Message, ContentBlock } from '../types';
import { useStore } from '../store';

const BASE_URL = 'https://token.sensenova.cn/v1';

function getServerUrl(key: string, envFallback: string, defaultUrl: string): string {
  const config = useStore.getState().config as any;
  return config[key] || import.meta.env[envFallback] || defaultUrl;
}

const QWEN35_MODEL_NAME = import.meta.env.VITE_QWEN35_MODEL_NAME || 'DGX-Qwen3.5-9B';

interface SendMessageParams {
  apiKey: string;
  model: ModelType;
  messages: Message[];
  config: {
    temperature: number;
    maxTokens: number;
    thinking: {
      enabled: boolean;
      effort: 'high' | 'low';
    };
  };
  onChunk: (content: string, reasoning?: string) => void;
  onComplete: (fullContent: string, reasoning?: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function sendChatMessage({
  apiKey,
  model,
  messages,
  config,
  onChunk,
  onComplete,
  onError,
  signal,
}: SendMessageParams): Promise<void> {
  try {
    const formattedMessages = messages.map((msg) => {
      if (msg.images && msg.images.length > 0 && msg.role === 'user') {
        const contentBlocks: ContentBlock[] = [
          { type: 'text', text: msg.content },
        ];
        msg.images.forEach((img) => {
          contentBlocks.push({
            type: 'image_url',
            image_url: { url: img },
          });
        });
        return { role: msg.role, content: contentBlocks };
      }
      return { role: msg.role, content: msg.content };
    });

    const requestBody: any = {
      model,
      messages: formattedMessages,
      stream: true,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    if (model === 'deepseek-v4-flash') {
      requestBody.thinking = {
        type: config.thinking.enabled ? 'enabled' : 'disabled',
        reasoning_effort: config.thinking.effort,
      };
    }

    // 确定 API URL
    let apiUrl = `${BASE_URL}/chat/completions`;
    let headers: any = {
      'Content-Type': 'application/json',
    };

    if (model === 'qwen3.5-9b') {
      const qwen35Url = getServerUrl('qwen35ServerUrl', 'VITE_QWEN35_API_URL', 'http://192.168.199.107:8000');
      const config = useStore.getState().config;
      const qwen35Key = config.qwen35ApiKey || import.meta.env.VITE_QWEN35_API_KEY || '';
      apiUrl = `${qwen35Url}/v1/chat/completions`;
      requestBody.model = QWEN35_MODEL_NAME;
      requestBody.chat_template_kwargs = { enable_thinking: true };
      headers.Authorization = `Bearer ${qwen35Key}`;
    } else {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errorData.message || `API 请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let fullReasoning = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              fullContent += delta.content;
              onChunk(fullContent, fullReasoning);
            }

            if (model === 'deepseek-v4-flash' && delta?.reasoning_content) {
              fullReasoning += delta.reasoning_content;
              onChunk(fullContent, fullReasoning);
            }

            if (model === 'qwen3.5-9b' && delta?.reasoning) {
              fullReasoning += delta.reasoning;
              onChunk(fullContent, fullReasoning);
            }
          } catch (e) {
            console.error('解析 SSE 数据失败:', e);
          }
        }
      }
    }

    onComplete(fullContent, fullReasoning);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface GenerateFluxKleinParams {
  prompt: string;
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function generateFluxKlein({
  prompt,
  width,
  height,
  steps,
  guidanceScale,
  seed,
  onComplete,
  onError,
  signal,
}: GenerateFluxKleinParams): Promise<void> {
  try {
    const FLUX_API_URL = getServerUrl('fluxServerUrl', 'VITE_FLUX_API_URL', 'http://192.168.199.107:8787');
    const response = await fetch(`${FLUX_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        num_inference_steps: steps,
        guidance_scale: guidanceScale,
        seed: seed ?? null,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = `${FLUX_API_URL}${data.url}`;
    onComplete(imageUrl);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface UploadImagesParams {
  files: File[];
  onComplete: (imageUrls: string[]) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function uploadImages({
  files,
  onComplete,
  onError,
  signal,
}: UploadImagesParams): Promise<void> {
  try {
    const FLUX_API_URL = getServerUrl('fluxServerUrl', 'VITE_FLUX_API_URL', 'http://192.168.199.107:8787');
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${FLUX_API_URL}/upload-images`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const imageUrls = data.uploaded_files.map((f: any) => `${FLUX_API_URL}${f.url}`);
    onComplete(imageUrls);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface EditFluxKleinParams {
  prompt: string;
  imagePaths: string[];
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  strength: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function editFluxKlein({
  prompt,
  imagePaths,
  width,
  height,
  steps,
  guidanceScale,
  strength,
  seed,
  onComplete,
  onError,
  signal,
}: EditFluxKleinParams): Promise<void> {
  try {
    const FLUX_API_URL = getServerUrl('fluxServerUrl', 'VITE_FLUX_API_URL', 'http://192.168.199.107:8787');
    const relativePaths = imagePaths.map(path => path.replace(FLUX_API_URL, ''));
    
    const response = await fetch(`${FLUX_API_URL}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_paths: relativePaths,
        width,
        height,
        num_inference_steps: steps,
        guidance_scale: guidanceScale,
        strength,
        seed: seed ?? null,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = `${FLUX_API_URL}${data.url}`;
    onComplete(imageUrl);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface GenerateImageParams {
  apiKey: string;
  prompt: string;
  size: string;
  n: number;
  onComplete: (images: string[]) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function generateImage({
  apiKey,
  prompt,
  size,
  n,
  onComplete,
  onError,
  signal,
}: GenerateImageParams): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sensenova-u1-fast',
        prompt,
        size,
        n,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    const images = data.data?.map((item: any) => item.url) || [];
    onComplete(images);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

// ====================================
// JoyAI 服务
// ====================================

interface JoyAITextToImageParams {
  prompt: string;
  negativePrompt?: string;
  steps: number;
  guidanceScale: number;
  height: number;
  width: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function joyAITextToImage({
  prompt,
  negativePrompt = '',
  steps,
  guidanceScale,
  height,
  width,
  seed,
  onComplete,
  onError,
  signal,
}: JoyAITextToImageParams): Promise<void> {
  try {
    const JOYAI_API_URL = getServerUrl('joyaiServerUrl', 'VITE_JOYAI_API_URL', 'http://192.168.199.107:8788');
    const response = await fetch(`${JOYAI_API_URL}/joyai/text-to-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt,
        steps,
        guidance_scale: guidanceScale,
        height,
        width,
        seed: seed ?? null,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = `${JOYAI_API_URL}${data.url}`;
    onComplete(imageUrl);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface JoyAIEditImageParams {
  prompt: string;
  imagePath: string;
  negativePrompt?: string;
  steps: number;
  guidanceScale: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function joyAIEditImage({
  prompt,
  imagePath,
  negativePrompt = '',
  steps,
  guidanceScale,
  seed,
  onComplete,
  onError,
  signal,
}: JoyAIEditImageParams): Promise<void> {
  try {
    const JOYAI_API_URL = getServerUrl('joyaiServerUrl', 'VITE_JOYAI_API_URL', 'http://192.168.199.107:8788');
    const relativePath = imagePath.replace(JOYAI_API_URL, '');
    const response = await fetch(`${JOYAI_API_URL}/joyai/edit-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_path: relativePath,
        negative_prompt: negativePrompt,
        steps,
        guidance_scale: guidanceScale,
        seed: seed ?? null,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = `${JOYAI_API_URL}${data.url}`;
    onComplete(imageUrl);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface JoyAIUnderstandImageParams {
  imagePath?: string;
  imagePaths?: string[];
  question: string;
  maxNewTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  onComplete: (description: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function joyAIUnderstandImage({
  imagePath,
  imagePaths,
  question,
  maxNewTokens = 2048,
  temperature = 0.7,
  topP = 0.8,
  topK = 50,
  onComplete,
  onError,
  signal,
}: JoyAIUnderstandImageParams): Promise<void> {
  try {
    const JOYAI_API_URL = getServerUrl('joyaiServerUrl', 'VITE_JOYAI_API_URL', 'http://192.168.199.107:8788');
    const requestBody: any = {
      question,
      max_new_tokens: maxNewTokens,
      temperature,
      top_p: topP,
      top_k: topK,
    };
    
    if (imagePaths && imagePaths.length > 0) {
      const relativePaths = imagePaths.map(path => path.replace(JOYAI_API_URL, ''));
      requestBody.image_paths = relativePaths;
    } else if (imagePath) {
      const relativePath = imagePath.replace(JOYAI_API_URL, '');
      requestBody.image_path = relativePath;
    }
    
    const response = await fetch(`${JOYAI_API_URL}/joyai/understand-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    onComplete(data.description);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface JoyAISpatialTransformParams {
  imagePath: string;
  prompt: string;
  steps: number;
  guidanceScale: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function joyAISpatialTransform({
  imagePath,
  prompt,
  steps,
  guidanceScale,
  seed,
  onComplete,
  onError,
  signal,
}: JoyAISpatialTransformParams): Promise<void> {
  try {
    const JOYAI_API_URL = getServerUrl('joyaiServerUrl', 'VITE_JOYAI_API_URL', 'http://192.168.199.107:8788');
    const relativePath = imagePath.replace(JOYAI_API_URL, '');
    const response = await fetch(`${JOYAI_API_URL}/joyai/spatial-transform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_path: relativePath,
        operation_type: 'move',
        prompt,
        steps,
        guidance_scale: guidanceScale,
        seed: seed ?? null,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = `${JOYAI_API_URL}${data.url}`;
    onComplete(imageUrl);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

interface JoyAIUploadImagesParams {
  files: File[];
  onComplete: (imageUrls: string[]) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function joyAIUploadImages({
  files,
  onComplete,
  onError,
  signal,
}: JoyAIUploadImagesParams): Promise<void> {
  try {
    const JOYAI_API_URL = getServerUrl('joyaiServerUrl', 'VITE_JOYAI_API_URL', 'http://192.168.199.107:8788');
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${JOYAI_API_URL}/joyai/upload-images`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const imageUrls = data.uploaded_files.map((f: any) => `${JOYAI_API_URL}${f.url}`);
    onComplete(imageUrls);
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

// ====================================
// HiDream-O1-Image 服务
// app.py 使用 SSE 两步架构:
//   1. POST /api/generate/start  -> { job_id }
//   2. GET  /api/generate/stream/<job_id>  -> SSE (progress + done/error)
// 图片以 base64 返回在 SSE "done" 事件中
// ====================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface HiDreamGenerateParams {
  prompt: string;
  mode: 't2i' | 'edit' | 'subject';
  width?: number;
  height?: number;
  seed?: number;
  images?: File[];
  keepAspect?: boolean;
  scheduler?: 'flow_match' | 'flash';
  onProgress?: (step: number, total: number) => void;
  signal?: AbortSignal;
}

export function hiDreamGenerate({
  prompt,
  mode,
  width = 2048,
  height = 2048,
  seed = 32,
  images = [],
  keepAspect = false,
  scheduler = 'flow_match',
  onProgress,
  signal,
}: HiDreamGenerateParams): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const HIDREAM_API_URL = getServerUrl('hidreamServerUrl', 'VITE_HIDREAM_API_URL', 'http://192.168.199.107:7860');

      if (signal?.aborted) {
        reject(new Error('请求已取消'));
        return;
      }

      const refsB64: string[] = [];
      for (const file of images) {
        const b64 = await fileToBase64(file);
        refsB64.push(b64);
      }

      console.log(`[HiDream] mode=${mode}, prompt="${prompt}", refs=${refsB64.length}`);

      const startResponse = await fetch(`${HIDREAM_API_URL}/api/generate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode,
          width,
          height,
          seed,
          refs_b64: refsB64,
          keep_original_aspect: keepAspect,
          editing_scheduler: scheduler,
        }),
        signal,
      });

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        console.error('[HiDream] start error:', startResponse.status, errorText);
        throw new Error(`启动生成失败: ${startResponse.status}`);
      }

      const startData = await startResponse.json();

      if (startData.error) {
        throw new Error(startData.error);
      }

      const jobId = startData.job_id;
      console.log('[HiDream] job_id:', jobId);

      const eventSource = new EventSource(`${HIDREAM_API_URL}/api/generate/stream/${jobId}`);
      
      // Handle abort for EventSource
      const handleAbort = () => {
        eventSource.close();
        reject(new Error('请求已取消'));
      };
      
      if (signal) {
        signal.addEventListener('abort', handleAbort);
      }

      eventSource.onmessage = (event) => {
        try {
          console.log('[HiDream] SSE event received:', event.data);
          const msg = JSON.parse(event.data);
          console.log('[HiDream] Parsed message:', msg);

          if (msg.type === 'progress') {
            console.log(`[HiDream] progress: ${msg.step}/${msg.total}`);
            if (onProgress) {
              onProgress(msg.step, msg.total);
            }
          } else if (msg.type === 'done') {
            console.log('[HiDream] done, image received (base64)');
            eventSource.close();
            if (signal) {
              signal.removeEventListener('abort', handleAbort);
            }
            const imageUrl = `data:image/png;base64,${msg.image}`;
            console.log('[HiDream] Resolving promise with imageUrl');
            resolve(imageUrl);
          } else if (msg.type === 'error') {
            console.error('[HiDream] error:', msg.message);
            eventSource.close();
            if (signal) {
              signal.removeEventListener('abort', handleAbort);
            }
            const errorMsg = msg.message || '生成失败';
            reject(new Error(errorMsg));
          } else {
            console.log('[HiDream] Unknown message type:', msg.type);
          }
        } catch (parseErr) {
          console.error('[HiDream] SSE parse error:', parseErr, 'data:', event.data);
          eventSource.close();
          if (signal) {
            signal.removeEventListener('abort', handleAbort);
          }
          reject(parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[HiDream] SSE connection error:', err);
        eventSource.close();
        if (signal) {
          signal.removeEventListener('abort', handleAbort);
        }
        const errorMsg = 'SSE 连接断开，请检查服务是否正常运行';
        reject(new Error(errorMsg));
      };
    } catch (error) {
      console.error('[HiDream] Error:', error);
      const errorMsg = error instanceof Error ? error.message : '网络请求失败，请检查服务是否已启动';
      reject(new Error(errorMsg));
    }
  });
}

export async function hiDreamTextToImage(params: Omit<HiDreamGenerateParams, 'mode' | 'images'>) {
  return hiDreamGenerate({ ...params, mode: 't2i', images: [] });
}

export async function hiDreamEditImage(params: Omit<HiDreamGenerateParams, 'mode'> & { image: File }) {
  return hiDreamGenerate({ ...params, mode: 'edit', images: [params.image] });
}

export async function hiDreamSubjectDriven(params: Omit<HiDreamGenerateParams, 'mode'> & { referenceImages: File[] }) {
  return hiDreamGenerate({ ...params, mode: 'subject', images: params.referenceImages });
}

// ====================================
// ERNIE-Image 服务
// ====================================

interface ErnieTextToImageParams {
  prompt: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  usePe?: boolean;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function ernieTextToImage({
  prompt,
  width = 848,
  height = 1264,
  numInferenceSteps = 50,
  guidanceScale = 4.0,
  usePe = true,
  onComplete,
  onError,
  signal,
}: ErnieTextToImageParams): Promise<void> {
  try {
    const ERNIE_API_URL = getServerUrl('ernieServerUrl', 'VITE_ERNIE_API_URL', 'http://192.168.199.107:30000');
    console.log('ERNIE-Image 调用参数:', {
      url: `${ERNIE_API_URL}/v1/images/generations`,
      prompt,
      width,
      height,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
      use_pe: usePe,
    });

    const response = await fetch(`${ERNIE_API_URL}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
        use_pe: usePe,
      }),
      signal,
    });

    console.log('ERNIE-Image 响应状态:', response.status);
    console.log('ERNIE-Image Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERNIE-Image 错误响应:', errorText);
      throw new Error(`请求失败: ${response.status} - ${errorText}`);
    }

    // 先检查响应类型
    const contentType = response.headers.get('content-type');
    let imageUrl: string;

    if (contentType && contentType.includes('application/json')) {
      // 如果是 JSON 响应，解析它
      const data = await response.json();
      console.log('ERNIE-Image JSON 响应:', data);
      
      // 尝试找到图片URL
      if (data.url) {
        // 如果返回完整URL
        imageUrl = data.url.startsWith('http') 
          ? data.url 
          : `http://192.168.199.107:30000${data.url}`;
      } else if (data.data && Array.isArray(data.data) && data.data[0]) {
        // 如果是 OpenAI 格式
        const imageItem = data.data[0];
        if (imageItem.url) {
          let url = imageItem.url;
          // 处理完整URL为代理路径
          if (url.startsWith('http://192.168.199.107:30000') || 
              url.startsWith('https://192.168.199.107:30000')) {
            url = url.replace(/^https?:\/\/192\.168\.199\.107:30000/, '/ernie-images');
          } else if (url.startsWith('/v1/images')) {
            url = `/ernie-images${url}`;
          }
          imageUrl = url;
        } else if (imageItem.b64_json) {
          // base64格式
          imageUrl = `data:image/jpeg;base64,${imageItem.b64_json}`;
        } else {
          throw new Error('未知的响应格式');
        }
      } else {
        throw new Error('响应格式不正确');
      }
    } else {
      // 如果是直接的图片数据
      const blob = await response.blob();
      console.log('ERNIE-Image 响应 blob:', blob.size, 'bytes');
      imageUrl = URL.createObjectURL(blob);
    }

    onComplete(imageUrl);
  } catch (error) {
    console.error('ERNIE-Image 请求异常:', error);
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

// ====================================
// Qwen-Image-Edit-2511 服务
// ====================================

interface QwenEditImageParams {
  prompt: string;
  images: File[];
  numInferenceSteps?: number;
  guidanceScale?: number;
  trueCfgScale?: number;
  seed?: number;
  onComplete: (imageUrls: string[]) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function qwenEditImage({
  prompt,
  images,
  numInferenceSteps = 40,
  guidanceScale = 1.0,
  trueCfgScale = 4.0,
  seed = 0,
  onComplete,
  onError,
  signal,
}: QwenEditImageParams): Promise<void> {
  try {
    const QWEN_API_URL = getServerUrl('qwenServerUrl', 'VITE_QWEN_API_URL', 'http://192.168.199.107:5000');
    const qwenApiKey = useStore.getState().config.qwenApiKey || '';
    const imagesBase64: string[] = [];
    for (const image of images) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(image);
      imagesBase64.push(await base64Promise);
    }

    const content: any[] = [];

    imagesBase64.forEach(base64 => {
      content.push({
        type: 'image_url',
        image_url: { url: base64 }
      });
    });

    content.push({ type: 'text', text: prompt });

    const requestBody = {
      messages: [{
        role: 'user',
        content: content
      }],
      extra_body: {
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
        true_cfg_scale: trueCfgScale,
        seed: seed,
      }
    };

    const response = await fetch(`${QWEN_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(qwenApiKey ? { 'Authorization': `Bearer ${qwenApiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errorData.message || `请求失败: ${response.status}`);
    }

    const data = await response.json();

    let imageUrls: string[] = [];
    if (data.choices && data.choices[0]?.message?.content) {
      const respContent = data.choices[0].message.content;
      if (Array.isArray(respContent)) {
        respContent.forEach((item: any) => {
          if (item.type === 'image_url' && item.image_url?.url) {
            imageUrls.push(item.image_url.url);
          }
        });
      }
    }

    if (imageUrls.length === 0) {
      throw new Error('未找到生成的图片');
    }

    onComplete(imageUrls);
  } catch (error) {
    console.error('Qwen-Image-Edit 请求异常:', error);
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

// ====================================
// FireRed-Image-Edit 服务
// ====================================

interface FireRedEditImageParams {
  prompt: string;
  images: File[];
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  onComplete: (imageUrls: string[]) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function fireRedEditImage({
  prompt,
  images,
  numInferenceSteps = 50,
  guidanceScale = 1.0,
  seed = 42,
  onComplete,
  onError,
  signal,
}: FireRedEditImageParams): Promise<void> {
  try {
    const FIRERED_API_URL = getServerUrl('fireredServerUrl', 'VITE_FIRERED_API_URL', 'http://192.168.199.107:8091');
    const fireredApiKey = useStore.getState().config.fireredApiKey || '';
    const imagesBase64: string[] = [];
    for (const image of images) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(image);
      imagesBase64.push(await base64Promise);
    }

    // 构建请求体 - 按照 curl 示例格式
    const content: any[] = [];
    
    // 添加图片
    imagesBase64.forEach(base64 => {
      content.push({
        type: 'image_url',
        image_url: { url: base64 }
      });
    });
    
    // 添加文本
    content.push({ type: 'text', text: prompt });
    
    const requestBody = {
      messages: [{ 
        role: 'user', 
        content: content 
      }],
      extra_body: {
        num_inference_steps: numInferenceSteps,
        cfg_scale: guidanceScale,
        seed: seed,
        layers: 4,
        resolution: 640
      }
    };

    console.log('发送请求到 FireRed 服务...');
    const response = await fetch(`${FIRERED_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(fireredApiKey ? { 'Authorization': `Bearer ${fireredApiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errorData.message || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('FireRed 响应:', data);
    
    // 解析响应 - 按照 curl 示例中的格式
    let imageUrls: string[] = [];
    if (data.choices && data.choices[0]?.message?.content) {
      const respContent = data.choices[0].message.content;
      if (Array.isArray(respContent)) {
        respContent.forEach((item: any) => {
          if (item.type === 'image_url' && item.image_url?.url) {
            imageUrls.push(item.image_url.url);
          }
        });
      }
    }
    
    if (imageUrls.length === 0) {
      throw new Error('未找到生成的图片');
    }
    
    onComplete(imageUrls);
  } catch (error) {
    console.error('FireRed-Image-Edit 错误:', error);
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

// ====================================
// SenseNova-U1-8B-MoT 服务
// ====================================

interface SenseNovaU1TextToImageParams {
  prompt: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  width?: number;
  height?: number;
  onComplete: (imageUrls: string[]) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

interface SenseNovaU1EditImageParams {
  prompt: string;
  images: File[];
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  onComplete: (imageUrls: string[]) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function senseNovaU1TextToImage({
  prompt,
  numInferenceSteps = 50,
  guidanceScale = 1.0,
  seed = 42,
  width = 1024,
  height = 1024,
  onComplete,
  onError,
  signal,
}: SenseNovaU1TextToImageParams): Promise<void> {
  try {
    const SENSENOVA_U1_API_URL = getServerUrl('sensenovaU1ServerUrl', 'VITE_SENSENOVA_U1_API_URL', 'http://192.168.199.107:8092');
    const requestBody = {
      messages: [{ 
        role: 'user', 
        content: [{ type: 'text', text: prompt }]
      }],
      extra_body: {
        num_inference_steps: numInferenceSteps,
        cfg_scale: guidanceScale,
        seed: seed,
        layers: 4,
        resolution: Math.min(width, height)
      }
    };

    console.log('发送文生图请求到 SenseNova-U1-8B-MoT 服务...');
    const response = await fetch(`${SENSENOVA_U1_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errorData.message || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('SenseNova-U1-8B-MoT 文生图响应:', data);
    
    // 解析响应 - 按照 vllm-omni 格式
    let imageUrls: string[] = [];
    if (data.choices && data.choices[0]?.message?.content) {
      const respContent = data.choices[0].message.content;
      if (Array.isArray(respContent)) {
        respContent.forEach((item: any) => {
          if (item.type === 'image_url' && item.image_url?.url) {
            imageUrls.push(item.image_url.url);
          }
        });
      }
    }
    
    if (imageUrls.length === 0) {
      throw new Error('未找到生成的图片');
    }
    
    onComplete(imageUrls);
  } catch (error) {
    console.error('SenseNova-U1-8B-MoT 文生图错误:', error);
    onError(error instanceof Error ? error.message : '未知错误');
  }
}

export async function senseNovaU1EditImage({
  prompt,
  images,
  numInferenceSteps = 50,
  guidanceScale = 1.0,
  seed = 42,
  onComplete,
  onError,
  signal,
}: SenseNovaU1EditImageParams): Promise<void> {
  try {
    const SENSENOVA_U1_API_URL = getServerUrl('sensenovaU1ServerUrl', 'VITE_SENSENOVA_U1_API_URL', 'http://192.168.199.107:8092');
    const imagesBase64: string[] = [];
    for (const image of images) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(image);
      imagesBase64.push(await base64Promise);
    }

    // 构建请求体 - 按照 vllm-omni 格式
    const content: any[] = [];
    
    // 添加图片
    imagesBase64.forEach(base64 => {
      content.push({
        type: 'image_url',
        image_url: { url: base64 }
      });
    });
    
    // 添加文本
    content.push({ type: 'text', text: prompt });
    
    const requestBody = {
      messages: [{ 
        role: 'user', 
        content: content 
      }],
      extra_body: {
        num_inference_steps: numInferenceSteps,
        cfg_scale: guidanceScale,
        seed: seed,
        layers: 4,
        resolution: 640
      }
    };

    console.log('发送图像编辑请求到 SenseNova-U1-8B-MoT 服务...');
    const response = await fetch(`${SENSENOVA_U1_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errorData.message || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('SenseNova-U1-8B-MoT 图像编辑响应:', data);
    
    // 解析响应 - 按照 vllm-omni 格式
    let imageUrls: string[] = [];
    if (data.choices && data.choices[0]?.message?.content) {
      const respContent = data.choices[0].message.content;
      if (Array.isArray(respContent)) {
        respContent.forEach((item: any) => {
          if (item.type === 'image_url' && item.image_url?.url) {
            imageUrls.push(item.image_url.url);
          }
        });
      }
    }
    
    if (imageUrls.length === 0) {
      throw new Error('未找到生成的图片');
    }
    
    onComplete(imageUrls);
  } catch (error) {
    console.error('SenseNova-U1-8B-MoT 图像编辑错误:', error);
    onError(error instanceof Error ? error.message : '未知错误');
  }
}
