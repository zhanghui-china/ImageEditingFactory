import { Settings, Thermometer, Maximize2, Brain, Image, ImagePlus, Trash2, Sliders, Move, RotateCw, ZoomIn, ArrowLeftRight, ArrowUpDown, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
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
  
  const [isExpanded, setIsExpanded] = useState(true);

  const isDeepSeek = currentModel === 'deepseek-v4-flash';
  const isU1Fast = currentModel === 'sensenova-u1-fast';
  const isFluxKlein = currentModel === 'flux-klein';
  const isJoyAI = currentModel === 'joyai-image-edit';
  const isHiDream = currentModel === 'hidream-o1-image';
  const isErnieImage = currentModel === 'ernie-image';
  const isQwenImageEdit = currentModel === 'qwen-image-edit-2511';
  const isFireRedImageEdit = currentModel === 'firered-image-edit';
  const isFluxImageToImage = isFluxKlein && fluxMode === 'image-to-image';

  return (
    <div className="p-4 bg-sidebar-bg border-t border-card-bg">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">参数设置</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-card-bg transition-colors text-text-muted hover:text-text-secondary"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
        
        {isExpanded && <div className="space-y-4">

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
                <label className="text-xs text-text-secondary">图片宽度</label>
                <span className="text-xs text-text-muted ml-auto">{config.joyaiWidth}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="128"
                value={config.joyaiWidth}
                onChange={(e) => updateConfig({ joyaiWidth: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-pink-400" />
                <label className="text-xs text-text-secondary">图片高度</label>
                <span className="text-xs text-text-muted ml-auto">{config.joyaiHeight}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="128"
                value={config.joyaiHeight}
                onChange={(e) => updateConfig({ joyaiHeight: parseInt(e.target.value) })}
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



            {config.joyaiMode === 'spatial-transform' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Move size={14} className="text-pink-400" />
                    <label className="text-xs text-text-secondary">变换模式</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '物体移动', value: 'object-move', icon: <ArrowLeftRight size={12} /> },
                      { label: '物体旋转', value: 'object-rotate', icon: <RotateCw size={12} /> },
                      { label: '相机控制', value: 'camera-control', icon: <ZoomIn size={12} /> },
                    ].map((op) => (
                      <button
                        key={op.value}
                        onClick={() => updateConfig({ joyaiSpatialMode: op.value as any })}
                        className={`py-2 px-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          config.joyaiSpatialMode === op.value
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

                {config.joyaiSpatialMode === 'object-move' && (
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

                {config.joyaiSpatialMode === 'object-rotate' && (
                  <>
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RotateCw size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">旋转视角</label>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: '正', value: 'front' },
                          { label: '右', value: 'right' },
                          { label: '左', value: 'left' },
                          { label: '后', value: 'rear' },
                          { label: '前右', value: 'front-right' },
                          { label: '前左', value: 'front-left' },
                          { label: '后右', value: 'rear-right' },
                          { label: '后左', value: 'rear-left' },
                        ].map((view) => (
                          <button
                            key={view.value}
                            onClick={() => updateConfig({ joyaiRotateView: view.value as any })}
                            className={`py-1 px-2 text-xs rounded transition-colors ${
                              config.joyaiRotateView === view.value
                                ? 'bg-pink-400 text-white'
                                : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                            }`}
                          >
                            {view.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {config.joyaiSpatialMode === 'camera-control' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">偏航角度 (Yaw)</label>
                        <span className="text-xs text-text-muted ml-auto">{config.joyaiCameraYaw}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={config.joyaiCameraYaw}
                        onChange={(e) => updateConfig({ joyaiCameraYaw: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">俯仰角度 (Pitch)</label>
                        <span className="text-xs text-text-muted ml-auto">{config.joyaiCameraPitch}°</span>
                      </div>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="5"
                        value={config.joyaiCameraPitch}
                        onChange={(e) => updateConfig({ joyaiCameraPitch: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-pink-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ZoomIn size={14} className="text-pink-400" />
                        <label className="text-xs text-text-secondary">缩放方向</label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: '放大', value: 'in' },
                          { label: '不变', value: 'unchanged' },
                          { label: '缩小', value: 'out' },
                        ].map((zoom) => (
                          <button
                            key={zoom.value}
                            onClick={() => updateConfig({ joyaiCameraZoom: zoom.value as any })}
                            className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                              config.joyaiCameraZoom === zoom.value
                                ? 'bg-pink-400 text-white'
                                : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                            }`}
                          >
                            {zoom.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {isHiDream && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <label className="text-xs text-text-secondary">图片宽度</label>
                <span className="text-xs text-text-muted ml-auto">{config.hidreamWidth}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="128"
                value={config.hidreamWidth}
                onChange={(e) => updateConfig({ hidreamWidth: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <label className="text-xs text-text-secondary">图片高度</label>
                <span className="text-xs text-text-muted ml-auto">{config.hidreamHeight}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="128"
                value={config.hidreamHeight}
                onChange={(e) => updateConfig({ hidreamHeight: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-cyan-400" />
                <label className="text-xs text-text-secondary">推理步数</label>
                <span className="text-xs text-text-muted ml-auto">{config.hidreamSteps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={config.hidreamSteps}
                onChange={(e) => updateConfig({ hidreamSteps: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-cyan-400" />
                <label className="text-xs text-text-secondary">引导强度</label>
                <span className="text-xs text-text-muted ml-auto">{config.hidreamGuidanceScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={config.hidreamGuidanceScale}
                onChange={(e) => updateConfig({ hidreamGuidanceScale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {config.hidreamMode === 'edit-image' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-cyan-400" />
                  <label className="text-xs text-text-secondary">编辑强度</label>
                  <span className="text-xs text-text-muted ml-auto">{config.hidreamStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.hidreamStrength}
                  onChange={(e) => updateConfig({ hidreamStrength: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="text-xs text-text-muted text-center">
                  越高: 变化越大 | 越低: 保持原图
                </div>
              </div>
            )}

            {(config.hidreamMode === 'edit-image' || config.hidreamMode === 'subject-driven') && (
              <>
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-cyan-400" />
                  <label className="text-xs text-text-secondary">保持宽高比</label>
                  <button
                    onClick={() => updateConfig({ hidreamKeepAspect: !config.hidreamKeepAspect })}
                    className={`ml-auto w-12 h-6 rounded-full transition-colors ${
                      config.hidreamKeepAspect ? 'bg-cyan-400' : 'bg-card-bg'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        config.hidreamKeepAspect ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-cyan-400" />
                    <label className="text-xs text-text-secondary">调度器</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['flow_match', 'flash'].map((sched) => (
                      <button
                        key={sched}
                        onClick={() => updateConfig({ hidreamScheduler: sched as any })}
                        className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                          config.hidreamScheduler === sched
                            ? 'bg-cyan-400 text-white'
                            : 'bg-card-bg text-text-secondary hover:bg-opacity-80'
                        }`}
                      >
                        {sched === 'flow_match' ? 'Flow Match' : 'Flash'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {isErnieImage && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-yellow-400" />
                <label className="text-xs text-text-secondary">图片宽度</label>
                <span className="text-xs text-text-muted ml-auto">{config.ernieWidth}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="16"
                value={config.ernieWidth}
                onChange={(e) => updateConfig({ ernieWidth: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-yellow-400" />
                <label className="text-xs text-text-secondary">图片高度</label>
                <span className="text-xs text-text-muted ml-auto">{config.ernieHeight}px</span>
              </div>
              <input
                type="range"
                min="512"
                max="2048"
                step="16"
                value={config.ernieHeight}
                onChange={(e) => updateConfig({ ernieHeight: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-yellow-400" />
                <label className="text-xs text-text-secondary">推理步数</label>
                <span className="text-xs text-text-muted ml-auto">{config.ernieSteps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={config.ernieSteps}
                onChange={(e) => updateConfig({ ernieSteps: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-yellow-400" />
                <label className="text-xs text-text-secondary">引导强度</label>
                <span className="text-xs text-text-muted ml-auto">{config.ernieGuidanceScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="20.0"
                step="0.5"
                value={config.ernieGuidanceScale}
                onChange={(e) => updateConfig({ ernieGuidanceScale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <Brain size={14} className="text-yellow-400" />
              <label className="text-xs text-text-secondary">PE 增强</label>
              <button
                onClick={() =>
                  updateConfig({ ernieUsePe: !config.ernieUsePe })}
                className={`ml-auto w-12 h-6 rounded-full transition-colors ${
                  config.ernieUsePe ? 'bg-yellow-400' : 'bg-card-bg'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    config.ernieUsePe ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {isQwenImageEdit && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-orange-400" />
                <label className="text-xs text-text-secondary">推理步数</label>
                <span className="text-xs text-text-muted ml-auto">{config.qwenSteps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={config.qwenSteps}
                onChange={(e) => updateConfig({ qwenSteps: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-orange-400" />
                <label className="text-xs text-text-secondary">引导强度</label>
                <span className="text-xs text-text-muted ml-auto">{config.qwenGuidanceScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={config.qwenGuidanceScale}
                onChange={(e) => updateConfig({ qwenGuidanceScale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-orange-400" />
                <label className="text-xs text-text-secondary">True CFG Scale</label>
                <span className="text-xs text-text-muted ml-auto">{config.qwenTrueCfgScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="20.0"
                step="0.5"
                value={config.qwenTrueCfgScale}
                onChange={(e) => updateConfig({ qwenTrueCfgScale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-orange-400" />
                <label className="text-xs text-text-secondary">随机种子</label>
                <span className="text-xs text-text-muted ml-auto">{config.qwenSeed}</span>
              </div>
              <input
                type="range"
                min="0"
                max="9999"
                step="1"
                value={config.qwenSeed}
                onChange={(e) => updateConfig({ qwenSeed: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>
          </>
        )}

        {isFireRedImageEdit && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-red-400" />
                <label className="text-xs text-text-secondary">推理步数</label>
                <span className="text-xs text-text-muted ml-auto">{config.fireredSteps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={config.fireredSteps}
                onChange={(e) => updateConfig({ fireredSteps: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-red-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-red-400" />
                <label className="text-xs text-text-secondary">引导强度</label>
                <span className="text-xs text-text-muted ml-auto">{config.fireredGuidanceScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={config.fireredGuidanceScale}
                onChange={(e) => updateConfig({ fireredGuidanceScale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-red-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-red-400" />
                <label className="text-xs text-text-secondary">随机种子</label>
                <span className="text-xs text-text-muted ml-auto">{config.fireredSeed}</span>
              </div>
              <input
                type="range"
                min="0"
                max="9999"
                step="1"
                value={config.fireredSeed}
                onChange={(e) => updateConfig({ fireredSeed: parseInt(e.target.value) })}
                className="w-full h-2 bg-card-bg rounded-lg appearance-none cursor-pointer accent-red-400"
              />
            </div>
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
        </div>}
      </div>
    </div>
  );
}
