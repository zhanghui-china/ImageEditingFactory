import { Bot, Sparkles, Zap, Palette, Wand2 } from 'lucide-react';
import { ModelType } from '../types';
import { useStore } from '../store';

interface ModelInfo {
  id: ModelType;
  name: string;
  icon: typeof Bot;
  color: string;
  description: string;
  features: string[];
}

const models: ModelInfo[] = [
  {
    id: 'sensenova-6.7-flash-lite',
    name: 'SenseNova 6.7 Flash-Lite',
    icon: Bot,
    color: 'text-sensenova-blue',
    description: '轻量多模态智能体模型',
    features: ['文本对话', '图像理解', '256K 上下文'],
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    icon: Sparkles,
    color: 'text-deepseek-purple',
    description: '高性能深度思考模型',
    features: ['思考模式', '工具调用', 'JSON 输出'],
  },
  {
    id: 'sensenova-u1-fast',
    name: 'SenseNova U1 Fast',
    icon: Zap,
    color: 'text-u1-orange',
    description: '信息图生成加速版',
    features: ['专业信息图', '多尺寸支持', '高质量输出'],
  },
  {
    id: 'flux-klein',
    name: 'FLUX.2 Klein 9B',
    icon: Palette,
    color: 'text-emerald-400',
    description: '本地部署文生图模型',
    features: ['本地 GPU 推理', '高分辨率', '快速生成'],
  },
  {
    id: 'joyai-image-edit',
    name: 'JoyAI Image Edit',
    icon: Wand2,
    color: 'text-pink-400',
    description: '图像理解与空间变换模型',
    features: ['图像理解', '文生图', '图像编辑', '空间变换'],
  },
];

export default function ModelSelector() {
  const { currentModel, setCurrentModel } = useStore();

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-text-secondary">选择模型</h2>
      <div className="space-y-2">
        {models.map((model) => {
          const Icon = model.icon;
          const isSelected = currentModel === model.id;

          return (
            <button
              key={model.id}
              onClick={() => setCurrentModel(model.id)}
              className={`w-full p-3 rounded-lg transition-all duration-200 group ${
                isSelected
                  ? 'bg-card-bg border-2 border-' + model.color.replace('text-', '')
                  : 'bg-sidebar-bg border-2 border-transparent hover:bg-card-bg'
              }`}
              style={{
                borderColor: isSelected
                  ? model.color === 'text-sensenova-blue'
                    ? '#3b82f6'
                    : model.color === 'text-deepseek-purple'
                    ? '#8b5cf6'
                    : model.color === 'text-emerald-400'
                    ? '#34d399'
                    : model.color === 'text-pink-400'
                    ? '#f472b6'
                    : '#f59e0b'
                  : 'transparent',
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-deep-bg ${model.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`font-medium ${model.color} text-sm`}>
                    {model.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {model.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {model.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs px-2 py-0.5 rounded bg-deep-bg text-text-secondary"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
