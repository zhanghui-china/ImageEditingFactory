import { Settings, Thermometer, Maximize2, Brain, Image, ImagePlus, Trash2, Sliders, Move, RotateCw, ZoomIn, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { useStore } from '../store';

const imageSizes = [
  { label: '16:9 横版', value: '2752x1536' },
  { label: '9:16 竖版', value: '1536x2752' },
  { label: '1:1 正方形', value: '2048x2048' },
  { label: '4:3 标准', value: '2368x1760' },
  { label: '3:4 竖版', value: '1760x2368' },
  { label: '21:9 超宽', value: '1344x3136' },
];

export default function SettingsPanel() {
  const currentModel = useStore((state) => state.currentModel);
  const config = useStore((state) => state.config);
  const updateConfig = useStore((state) => state.updateConfig);
  const clearMessages = useStore((state) => state.clearMessages);
  const messages = useStore((state) => state.getCurrentMessages());
  const messagesByModel = useStore((state) => state.messagesByModel);
  const fluxMode = useStore((state) => state.fluxMode);

  const isDeepSeek = currentModel === 'deepseek-v4-flash';
  const isU1Fast = currentModel === 'sensenova-u1-fast';
  const isFluxKlein = currentModel === 'flux-klein';
  const isJoyAI = currentModel === 'joyai-image-edit';
  const isFluxImageToImage = isFluxKlein && fluxMode === 'image-to-image';

  return (
    <div className="p-4 bg-sidebar-bg border-t border-card-bg">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} className="text-text-secondary" />
          <span className="text-sm font-medium text-text-secondary">参数设置</span>
        </div>

        {!isU1Fast && !isFluxKlein && !isJoyAI && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer size={14} className="text-text-muted" />
                <label className="text-xs text-text-secondary">Temperature</label>
                <span className="text-xs text-text-muted ml-auto">
                  {config.temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) =>
                  updateConfig({ temperature: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-sensenova-blue"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Maximize2 size={14} className="text-text-muted" />
                <label className="text-xs text-text-secondary">Max Tokens</label>
                <span className="text-xs text-text-muted ml-auto">
                  {config.maxTokens}
                </span>
              </div>
              <input
                type="range"
                min="256"
                max="65536"
                step="256"
                value={config.maxTokens}
                onChange={(e) =>
                  updateConfig({ maxTokens: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-sensenova-blue"
              />
            </div>
          </>
        )}

        {isDeepSeek && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-deepseek-purple" />
              <label className="text-xs text-text-secondary">思考模式</label>
              <button
                onClick={() =>
                  updateConfig({
                    thinking: {
                      ...config.thinking,
                      enabled: !config.thinking.enabled,
                    },
                  })
                }
                className={`ml-auto w-12 h-6 rounded-full transition-colors ${
                  config.thinking.enabled
                    ? 'bg-deepseek-purple'
                    : 'bg-card-bg'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    config.thinking.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {config.thinking.enabled && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() =>
                    updateConfig({
                      thinking: { ...config.thinking, effort: 'high' },
                    })
                  }
                  className={`flex-1 py-1.5 px-3 text-xs rounded-lg transition-colors ${
                    config.thinking.effort === 'high'
                      ? 'bg-deepseek-purple text-white'
                      : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                  }`}
                >
                  高强度
                </button>
                <button
                  onClick={() =>
                    updateConfig({
                      thinking: { ...config.thinking, effort: 'low' },
                    })
                  }
                  className={`flex-1 py-1.5 px-3 text-xs rounded-lg transition-colors ${
                    config.thinking.effort === 'low'
                      ? 'bg-deepseek-purple text-white'
                      : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                  }`}
                >
                  低强度
                </button>
              </div>
            )}
          </div>
        )}

        {isU1Fast && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image size={14} className="text-u1-orange" />
                <label className="text-xs text-text-secondary">图片尺寸</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {imageSizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => updateConfig({ imageSize: size.value })}
                    className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                      config.imageSize === size.value
                        ? 'bg-u1-orange text-white'
                        : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImagePlus size={14} className="text-u1-orange" />
                <label className="text-xs text-text-secondary">生成数量</label>
                <span className="text-xs text-text-muted ml-auto">
                  {config.imageCount} 张
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateConfig({ imageCount: n })}
                    className={`flex-1 py-2 text-xs rounded-lg transition-colors ${
                      config.imageCount === n
                        ? 'bg-u1-orange text-white'
                        : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {isFluxKlein && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-emerald-400" />
                <label className="text-xs text-text-secondary">图片宽度</label>
                <span className="text-xs text-text-muted ml-auto">{config.fluxWidth}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="128"
                value={config.fluxWidth}
                onChange={(e) => updateConfig({ fluxWidth: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-emerald-400" />
                <label className="text-xs text-text-secondary">图片高度</label>
                <span className="text-xs text-text-muted ml-auto">{config.fluxHeight}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="128"
                value={config.fluxHeight}
                onChange={(e) => updateConfig({ fluxHeight: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-emerald-400" />
                <label className="text-xs text-text-secondary">推理步数</label>
                <span className="text-xs text-text-muted ml-auto">{config.fluxSteps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={config.fluxSteps}
                onChange={(e) => updateConfig({ fluxSteps: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-emerald-400" />
                <label className="text-xs text-text-secondary">引导强度</label>
                <span className="text-xs text-text-muted ml-auto">{config.fluxGuidanceScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={config.fluxGuidanceScale}
                onChange={(e) => updateConfig({ fluxGuidanceScale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {isFluxImageToImage && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-emerald-400" />
                  <label className="text-xs text-text-secondary">编辑强度</label>
                  <span className="text-xs text-text-muted ml-auto">{config.fluxStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.fluxStrength}
                  onChange={(e) => updateConfig({ fluxStrength: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="text-xs text-text-muted text-center">
                  越高: 变化越大 | 越低: 保持原图
                </div>
              </div>
            )}
          </>
        )}

        {isJoyAI && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-pink-400" />
                <label className="text-xs text-text-secondary">基础尺寸</label>
                <span className="text-xs text-text-muted ml-auto">{config.joyaiBasesize}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="128"
                value={config.joyaiBasesize}
                onChange={(e) => updateConfig({ joyaiBasesize: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-pink-400" />
                <label className="text-xs text-text-secondary">推理步数</label>
                <span className="text-xs text-text-muted ml-auto">{config.joyaiSteps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={config.joyaiSteps}
                onChange={(e) => updateConfig({ joyaiSteps: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-pink-400" />
                <label className="text-xs text-text-secondary">引导强度</label>
                <span className="text-xs text-text-muted ml-auto">{config.joyaiGuidanceScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={config.joyaiGuidanceScale}
                onChange={(e) => updateConfig({ joyaiGuidanceScale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            {config.joyaiMode === 'edit-image' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-pink-400" />
                  <label className="text-xs text-text-secondary">编辑强度</label>
                  <span className="text-xs text-text-muted ml-auto">{config.joyaiStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.joyaiStrength}
                  onChange={(e) => updateConfig({ joyaiStrength: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                />
                <div className="text-xs text-text-muted text-center">
                  越高: 变化越大 | 越低: 保持原图
                </div>
              </div>
            )}

            {config.joyaiMode === 'spatial-transform' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Move size={14} className="text-pink-400" />
                    <label className="text-xs text-text-secondary">变换类型</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '物体移动', value: 'move', icon: <ArrowLeftRight size={12} /> },
                      { label: '物体旋转', value: 'rotate', icon: <RotateCw size={12} /> },
                      { label: '缩放/镜头', value: 'zoom', icon: <ZoomIn size={12} /> },
                      { label: '平移/倾斜', value: 'pan-tilt', icon: <ArrowUpDown size={12} /> },
                    ].map((op) => (
                      <button
                        key={op.value}
                        onClick={() => updateConfig({ joyaiOperationType: op.value as any })}
                        className={`py-2 px-3 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          config.joyaiOperationType === op.value
                            ? 'bg-pink-400 text-white'
                            : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                        }`}
                      >
                        {op.icon}
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(config.joyaiOperationType === 'move' || config.joyaiOperationType === 'rotate') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Move size={14} className="text-pink-400" />
                      <label className="text-xs text-text-secondary">目标物体描述</label>
                    </div>
                    <input
                      type="text"
                      value={config.joyaiObjectPrompt}
                      onChange={(e) => updateConfig({ joyaiObjectPrompt: e.target.value })}
                      placeholder="如: 猫、汽车、杯子..."
                      className="w-full bg-deep-bg border border-card-bg rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                    />
                  </div>
                )}

                {config.joyaiOperationType === 'move' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">水平位移 (ΔX)</label>
                        <span className="text-xs text-text-muted ml-auto">{config.joyaiMoveDx.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.5"
                        value={config.joyaiMoveDx}
                        onChange={(e) => updateConfig({ joyaiMoveDx: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">垂直位移 (ΔY)</label>
                        <span className="text-xs text-text-muted ml-auto">{config.joyaiMoveDy.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.5"
                        value={config.joyaiMoveDy}
                        onChange={(e) => updateConfig({ joyaiMoveDy: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                      />
                    </div>
                  </>
                )}

                {config.joyaiOperationType === 'rotate' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RotateCw size={14} className="text-pink-400" />
                      <label className="text-xs text-text-secondary">旋转角度</label>
                      <span className="text-xs text-text-muted ml-auto">{config.joyaiRotateAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={config.joyaiRotateAngle}
                      onChange={(e) => updateConfig({ joyaiRotateAngle: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                    />
                  </div>
                )}

                {config.joyaiOperationType === 'zoom' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ZoomIn size={14} className="text-pink-400" />
                      <label className="text-xs text-text-secondary">缩放倍数</label>
                      <span className="text-xs text-text-muted ml-auto">{config.joyaiZoomFactor.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={config.joyaiZoomFactor}
                      onChange={(e) => updateConfig({ joyaiZoomFactor: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                    />
                    <div className="text-xs text-text-muted text-center">
                      &lt;1: 缩小 | &gt;1: 放大
                    </div>
                  </div>
                )}

                {config.joyaiOperationType === 'pan-tilt' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">平移角度 (Pan)</label>
                        <span className="text-xs text-text-muted ml-auto">{config.joyaiPanAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="5"
                        value={config.joyaiPanAngle}
                        onChange={(e) => updateConfig({ joyaiPanAngle: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">倾斜角度 (Tilt)</label>
                        <span className="text-xs text-text-muted ml-auto">{config.joyaiTiltAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="5"
                        value={config.joyaiTiltAngle}
                        onChange={(e) => updateConfig({ joyaiTiltAngle: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {messages.length > 0 && (
          <button
            onClick={() => clearMessages(currentModel)}
            className="w-full mt-4 py-2 px-4 bg-card-bg hover:bg-opacity-80 text-error-red rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            清空 {currentModel.split('-')[0]} 对话
          </button>
        )}

        {Object.keys(messagesByModel).length > 0 && Object.values(messagesByModel).some(m => m.length > 0) && (
          <div className="mt-2 pt-2 border-t border-card-bg">
            <div className="text-xs text-text-muted mb-2">其他模型消息:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(messagesByModel)
                .filter(([model]) => model !== currentModel)
                .filter(([_, msgs]) => msgs.length > 0)
                .map(([model, msgs]) => (
                  <button
                    key={model}
                    onClick={() => clearMessages(model as any)}
                    className="text-xs py-1 px-2 bg-card-bg hover:bg-opacity-80 text-text-secondary rounded transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    清空 {model.split('-')[0]} ({msgs.length})
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
