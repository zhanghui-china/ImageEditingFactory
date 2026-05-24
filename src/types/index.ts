export type ModelType = 
  | 'sensenova-6.7-flash-lite' 
  | 'deepseek-v4-flash' 
  | 'sensenova-u1-fast' 
  | 'flux-klein' 
  | 'joyai-image-edit'
  | 'hidream-o1-image';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  reasoningContent?: string;
  images?: string[];
  timestamp: number;
  model: string;
  duration?: number;
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
  joyaiMode: 'text-to-image' | 'edit-image' | 'understand-image' | 'spatial-transform';
  joyaiSteps: number;
  joyaiGuidanceScale: number;
  joyaiBasesize: number;
  joyaiStrength: number;
  joyaiOperationType: 'move' | 'rotate' | 'zoom' | 'pan-tilt';
  joyaiMoveDx: number;
  joyaiMoveDy: number;
  joyaiRotateAngle: number;
  joyaiZoomFactor: number;
  joyaiPanAngle: number;
  joyaiTiltAngle: number;
  joyaiObjectPrompt: string;
  hidreamMode: 'text-to-image' | 'edit-image' | 'subject-driven';
  hidreamWidth: number;
  hidreamHeight: number;
  hidreamSteps: number;
  hidreamGuidanceScale: number;
  hidreamStrength: number;
  hidreamKeepAspect: boolean;
  hidreamScheduler: 'flow_match' | 'flash';
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
