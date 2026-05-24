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
};

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

      setError: (error) => set({ error }),

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
        messagesByModel: state.messagesByModel,
        fluxMode: state.fluxMode,
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
