export type ModelType = 'sensenova-6.7-flash-lite' | 'deepseek-v4-flash' | 'sensenova-u1-fast' | 'flux-klein';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  reasoningContent?: string;
  images?: string[];
  timestamp: number;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
  thinking: {
    enabled: boolean;
    effort: 'high' | 'low';
  };
  imageSize: string;
  imageCount: number;
  fluxWidth: number;
  fluxHeight: number;
  fluxSteps: number;
  fluxGuidanceScale: number;
  fluxStrength: number;
}

export interface ContentBlock {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | ContentBlock[];
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  thinking?: {
    type: string;
    reasoning_effort?: string;
  };
}

export interface ImageRequest {
  model: string;
  prompt: string;
  size?: string;
  n?: number;
}

export interface ApiError {
  error: {
    type: string;
    code: string;
    message: string;
  };
}
