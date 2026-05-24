import { ModelType, Message, ContentBlock } from '../types';

const BASE_URL = 'https://token.sensenova.cn/v1';
const FLUX_API_URL = import.meta.env.VITE_FLUX_API_URL || 'http://192.168.199.107:8787';
const JOYAI_API_URL = import.meta.env.VITE_JOYAI_API_URL || 'http://192.168.199.107:8788';
const SENSENOVA_API_KEY = import.meta.env.VITE_SENSENOVA_API_KEY || '';

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
