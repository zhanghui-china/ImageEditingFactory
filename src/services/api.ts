import { ModelType, Message, ContentBlock } from '../types';

const BASE_URL = 'https://token.sensenova.cn/v1';
const FLUX_API_URL = import.meta.env.VITE_FLUX_API_URL || 'http://192.168.199.107:8787';
const JOYAI_API_URL = import.meta.env.VITE_JOYAI_API_URL || 'http://192.168.199.107:8788';

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
}

export async function sendChatMessage({
  apiKey,
  model,
  messages,
  config,
  onChunk,
  onComplete,
  onError,
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

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
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
}: GenerateFluxKleinParams): Promise<void> {
  try {
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
}

export async function uploadImages({
  files,
  onComplete,
  onError,
}: UploadImagesParams): Promise<void> {
  try {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${FLUX_API_URL}/upload-images`, {
      method: 'POST',
      body: formData,
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
}: EditFluxKleinParams): Promise<void> {
  try {
    // Convert image paths to relative paths
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
}

export async function generateImage({
  apiKey,
  prompt,
  size,
  n,
  onComplete,
  onError,
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
  basesize: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
}

export async function joyAITextToImage({
  prompt,
  negativePrompt = '',
  steps,
  guidanceScale,
  basesize,
  seed,
  onComplete,
  onError,
}: JoyAITextToImageParams): Promise<void> {
  try {
    const response = await fetch(`${JOYAI_API_URL}/joyai/text-to-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt,
        steps,
        guidance_scale: guidanceScale,
        basesize,
        seed: seed ?? null,
      }),
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
  strength: number;
  steps: number;
  guidanceScale: number;
  basesize: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
}

export async function joyAIEditImage({
  prompt,
  imagePath,
  strength,
  steps,
  guidanceScale,
  basesize,
  seed,
  onComplete,
  onError,
}: JoyAIEditImageParams): Promise<void> {
  try {
    const relativePath = imagePath.replace(JOYAI_API_URL, '');
    const response = await fetch(`${JOYAI_API_URL}/joyai/edit-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_path: relativePath,
        strength,
        steps,
        guidance_scale: guidanceScale,
        basesize,
        seed: seed ?? null,
      }),
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
  imagePath: string;
  question: string;
  onComplete: (description: string) => void;
  onError: (error: string) => void;
}

export async function joyAIUnderstandImage({
  imagePath,
  question,
  onComplete,
  onError,
}: JoyAIUnderstandImageParams): Promise<void> {
  try {
    const relativePath = imagePath.replace(JOYAI_API_URL, '');
    const response = await fetch(`${JOYAI_API_URL}/joyai/understand-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_path: relativePath,
        question,
      }),
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
  operationType: 'move' | 'rotate' | 'zoom' | 'pan-tilt';
  objectPrompt: string;
  moveDx?: number;
  moveDy?: number;
  rotateAngle?: number;
  zoomFactor?: number;
  panAngle?: number;
  tiltAngle?: number;
  steps: number;
  guidanceScale: number;
  basesize: number;
  seed?: number;
  onComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
}

export async function joyAISpatialTransform({
  imagePath,
  operationType,
  objectPrompt,
  moveDx = 0,
  moveDy = 0,
  rotateAngle = 0,
  zoomFactor = 1,
  panAngle = 0,
  tiltAngle = 0,
  steps,
  guidanceScale,
  basesize,
  seed,
  onComplete,
  onError,
}: JoyAISpatialTransformParams): Promise<void> {
  try {
    const relativePath = imagePath.replace(JOYAI_API_URL, '');
    const response = await fetch(`${JOYAI_API_URL}/joyai/spatial-transform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_path: relativePath,
        operation_type: operationType,
        object_prompt: objectPrompt,
        move_dx: moveDx,
        move_dy: moveDy,
        rotate_angle: rotateAngle,
        zoom_factor: zoomFactor,
        pan_angle: panAngle,
        tilt_angle: tiltAngle,
        steps,
        guidance_scale: guidanceScale,
        basesize,
        seed: seed ?? null,
      }),
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
}

export async function joyAIUploadImages({
  files,
  onComplete,
  onError,
}: JoyAIUploadImagesParams): Promise<void> {
  try {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${JOYAI_API_URL}/joyai/upload-images`, {
      method: 'POST',
      body: formData,
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
}: HiDreamGenerateParams): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const refsB64: string[] = [];
      for (const file of images) {
        const b64 = await fileToBase64(file);
        refsB64.push(b64);
      }

      console.log(`[HiDream] mode=${mode}, prompt="${prompt}", refs=${refsB64.length}`);

      const startResponse = await fetch('/api/generate/start', {
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

      const eventSource = new EventSource(`/api/generate/stream/${jobId}`);

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
            const imageUrl = `data:image/png;base64,${msg.image}`;
            console.log('[HiDream] Resolving promise with imageUrl');
            resolve(imageUrl);
          } else if (msg.type === 'error') {
            console.error('[HiDream] error:', msg.message);
            eventSource.close();
            const errorMsg = msg.message || '生成失败';
            reject(new Error(errorMsg));
          } else {
            console.log('[HiDream] Unknown message type:', msg.type);
          }
        } catch (parseErr) {
          console.error('[HiDream] SSE parse error:', parseErr, 'data:', event.data);
          reject(parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[HiDream] SSE connection error:', err);
        eventSource.close();
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
