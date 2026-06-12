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
  abortController: AbortController | null;
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
  setAbortController: (controller: AbortController | null) => void;
  cancelRequest: () => void;
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
  joyaiWidth: 1024,
  joyaiHeight: 1024,
  joyaiSpatialMode: 'object-move',
  joyaiObjectPrompt: 'object',
  joyaiRotateView: 'front',
  joyaiCameraYaw: 0,
  joyaiCameraPitch: 0,
  joyaiCameraZoom: 'in',
  hidreamMode: 'text-to-image',
  hidreamWidth: 2048,
  hidreamHeight: 2048,
  hidreamSteps: 50,
  hidreamGuidanceScale: 4.0,
  hidreamStrength: 0.8,
  hidreamKeepAspect: true,
  hidreamScheduler: 'flow_match',
  ernieWidth: 848,
  ernieHeight: 1264,
  ernieSteps: 50,
  ernieGuidanceScale: 4.0,
  ernieUsePe: true,
  qwenSteps: 40,
  qwenGuidanceScale: 1.0,
  qwenTrueCfgScale: 4.0,
  qwenSeed: 0,
  fireredSteps: 50,
  fireredGuidanceScale: 1.0,
  fireredSeed: 42,
  sensenovaU1Steps: 50,
  sensenovaU1GuidanceScale: 1.0,
  sensenovaU1Seed: 42,
  sensenovaU1Mode: 'text-to-image',
  sensenovaU1Width: 1024,
  sensenovaU1Height: 1024,
  qwen35ServerUrl: 'http://192.168.199.107:8000',
  qwen35ApiKey: '',
  fluxServerUrl: 'http://192.168.199.107:8787',
  joyaiServerUrl: 'http://192.168.199.107:8788',
  hidreamServerUrl: 'http://192.168.199.107:7860',
  ernieServerUrl: 'http://192.168.199.107:30000',
  qwenServerUrl: 'http://192.168.199.107:5000',
  fireredServerUrl: 'http://192.168.199.107:8091',
  sensenovaU1ServerUrl: 'http://192.168.199.107:8092',
};

// 清理 localStorage 中的旧数据，避免空间溢出
try {
  const storage = localStorage.getItem('sensenova-storage');
  if (storage) {
    const parsed = JSON.parse(storage);
    if (parsed.state?.messagesByModel) {
      // 删除消息历史
      delete parsed.state.messagesByModel;
      localStorage.setItem('sensenova-storage', JSON.stringify(parsed));
    }
  }
} catch (e) {
  // 如果出错，清空整个 storage
  localStorage.removeItem('sensenova-storage');
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
      abortController: null,

      getApiKey: () => {
        const envKey = import.meta.env.VITE_SENSENOVA_API_KEY;
        if (envKey) {
          return envKey;
        }
        return get().apiKey;
      },

      setApiKey: (key) => set({ apiKey: key }),

      setCurrentModel: (model) => set({ currentModel: model }),

      setFluxMode: (mode) => set({ fluxMode: mode }),

      addMessage: (message) =>
        set((state) => {
          const model = message.model || state.currentModel;
          const currentMessages = state.messagesByModel[model] || [];
          const MAX_MESSAGES_PER_MODEL = 20;
          let newMessages = [...currentMessages, message];
          if (newMessages.length > MAX_MESSAGES_PER_MODEL) {
            newMessages = newMessages.slice(-MAX_MESSAGES_PER_MODEL);
          }
          return {
            messagesByModel: {
              ...state.messagesByModel,
              [model]: newMessages,
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

      setAbortController: (controller) => set({ abortController: controller }),

      cancelRequest: () => {
        const state = get();
        if (state.abortController) {
          state.abortController.abort();
          set({ abortController: null, isLoading: false });
        }
      },
    }),
    {
      name: 'sensenova-storage',
      partialize: (state) => ({
        apiKey: state.apiKey,
        currentModel: state.currentModel,
        config: state.config,
        fluxMode: state.fluxMode,
        // 暂时不保存 messagesByModel，避免 localStorage 溢出
        // messagesByModel: state.messagesByModel,
      }),
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<AppState>;
        return {
          ...currentState,
          ...ps,
          config: {
            ...currentState.config,
            ...(ps.config || {}),
          },
        };
      },
    }
  )
);
