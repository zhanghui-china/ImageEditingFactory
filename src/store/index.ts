import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModelType, Message, ModelConfig } from '../types';

interface MessagesByModel {
  [key: string]: Message[];
}

export type FluxMode = 'text-to-image' | 'image-to-image';

interface AppState {
  apiKey: string;
  currentModel: ModelType;
  messagesByModel: MessagesByModel;
  isLoading: boolean;
  error: string | null;
  config: ModelConfig;
  streamingContent: string;
  fluxMode: FluxMode;
  getApiKey: () => string;
  setApiKey: (key: string) => void;
  setCurrentModel: (model: ModelType) => void;
  addMessage: (message: Message) => void;
  updateStreamingMessage: (content: string, reasoningContent?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: (model?: ModelType) => void;
  updateConfig: (config: Partial<ModelConfig>) => void;
  resetStreaming: () => void;
  getCurrentMessages: () => Message[];
  setFluxMode: (mode: FluxMode) => void;
}

const defaultConfig: ModelConfig = {
  temperature: 1,
  maxTokens: 8192,
  thinking: {
    enabled: true,
    effort: 'high',
  },
  imageSize: '2752x1536',
  imageCount: 1,
  fluxWidth: 1024,
  fluxHeight: 1024,
  fluxSteps: 4,
  fluxGuidanceScale: 1.0,
  fluxStrength: 0.8,
  joyaiMode: 'text-to-image',
  joyaiSteps: 30,
  joyaiGuidanceScale: 4.0,
  joyaiBasesize: 1024,
  joyaiStrength: 0.8,
  joyaiOperationType: 'move',
  joyaiMoveDx: 0.0,
  joyaiMoveDy: 0.0,
  joyaiRotateAngle: 0.0,
  joyaiZoomFactor: 1.0,
  joyaiPanAngle: 0.0,
  joyaiTiltAngle: 0.0,
  joyaiObjectPrompt: '',
  hidreamMode: 'text-to-image',
  hidreamWidth: 2048,
  hidreamHeight: 2048,
  hidreamSteps: 50,
  hidreamGuidanceScale: 4.0,
  hidreamStrength: 0.8,
  hidreamKeepAspect: true,
  hidreamScheduler: 'flow_match',
};

// 清除旧的 localStorage 数据，防止超大图片占用配额
try {
  const oldData = localStorage.getItem('sensenova-storage');
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData);
      // 如果有旧的 messages，删除它们
      if (parsed.state && parsed.state.messagesByModel) {
        localStorage.removeItem('sensenova-storage');
        console.log('[Store] Cleared old storage with large messages');
      }
    } catch (e) {
      // 无效的 JSON，直接删除
      localStorage.removeItem('sensenova-storage');
    }
  }
} catch (e) {
  // 如果 localStorage 访问失败，忽略
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      currentModel: 'sensenova-6.7-flash-lite',
      messagesByModel: {},
      isLoading: false,
      error: null,
      config: defaultConfig,
      streamingContent: '',
      fluxMode: 'text-to-image',

      getApiKey: () => {
        // 优先从环境变量读取
        const envKey = import.meta.env.VITE_SENSENOVA_API_KEY;
        if (envKey) {
          return envKey;
        }
        // 降级到 store 中的 key（保持向后兼容）
        return get().apiKey;
      },

      setApiKey: (key) => set({ apiKey: key }),

      setCurrentModel: (model) => set({ currentModel: model }),

      setFluxMode: (mode) => set({ fluxMode: mode }),

      addMessage: (message) =>
        set((state) => {
          const model = message.model || state.currentModel;
          const currentMessages = state.messagesByModel[model] || [];
          return {
            messagesByModel: {
              ...state.messagesByModel,
              [model]: [...currentMessages, message],
            },
          };
        }),

      updateStreamingMessage: (content, reasoningContent?) =>
        set((state) => {
          const model = state.currentModel;
          const currentMessages = state.messagesByModel[model] || [];
          const messages = [...currentMessages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            messages[messages.length - 1] = {
              ...lastMessage,
              content,
              reasoningContent,
            };
          }
          return {
            messagesByModel: {
              ...state.messagesByModel,
              [model]: messages,
            },
          };
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error: error }),

      clearMessages: (model) =>
        set((state) => {
          if (model) {
            const { [model]: _, ...rest } = state.messagesByModel;
            return { messagesByModel: rest, error: null };
          } else {
            return { messagesByModel: {}, error: null };
          }
        }),

      updateConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      resetStreaming: () => set({ streamingContent: '' }),

      getCurrentMessages: () => {
        const state = get();
        return state.messagesByModel[state.currentModel] || [];
      },
    }),
    {
      name: 'sensenova-storage',
      partialize: (state) => ({
        apiKey: state.apiKey,
        currentModel: state.currentModel,
        config: state.config,
        fluxMode: state.fluxMode,
      }),
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<AppState>;
        return {
          ...currentState,
          ...ps,
          messagesByModel: {}, // 永远不从存储加载消息
          config: {
            ...currentState.config,
            ...(ps.config || {}),
          },
        };
      },
    }
  )
);
