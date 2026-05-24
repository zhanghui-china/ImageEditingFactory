# Image Editing Factory - 多模型 AI 平台

集成多个顶级 AI 模型的一体化平台，支持文本对话、图像理解、图像生成和图像编辑功能。

## 功能特性

### 支持的模型

| 模型 | 功能 | 描述 |
|------|------|------|
| **Sensenova 6.7 Flash Lite** | 文本对话 + 图像理解 | 轻量级多模态模型，支持文本和图像输入 |
| **DeepSeek V4 Flash** | 深度思考 + 文本对话 | 高性能深度思考模型，提供详细的推理过程 |
| **Sensenova U1 Fast** | 信息图生成 | 专门用于生成专业信息图和数据可视化 |
| **FLUX.2 Klein 9B** | 文生图 + 图生图 | 本地部署的高性能图像生成和编辑模型 |

### 核心功能

- 🔄 **实时流式响应** - 所有模型都支持流式输出，实现打字机效果
- 🖼️ **多模态对话** - 支持上传图片进行多轮对话
- 🎨 **图像生成与编辑** - 完整的 FLUX 图像生成和编辑工作流
- 📱 **响应式设计** - 现代化 UI，支持各种屏幕尺寸
- 🔐 **环境变量配置** - 安全的 API Key 管理

## 技术栈

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Vite** - 快速开发服务器和构建工具
- **Tailwind CSS** - 原子化 CSS 框架
- **Zustand** - 轻量级状态管理
- **Lucide React** - 精美的图标库

### 后端 (FLUX)
- **FastAPI** - 高性能 Python Web 框架
- **PyTorch** - 深度学习框架
- **ModelScope** - FLUX 模型加载

## 项目结构

```
.
├── src/
│   ├── components/        # React 组件
│   │   ├── ModelSelector.tsx    # 模型选择器
│   │   ├── ChatInterface.tsx    # 聊天界面
│   │   ├── InputArea.tsx        # 输入区域 (其他模型)
│   │   ├── FluxInputArea.tsx    # 输入区域 (FLUX)
│   │   ├── MessageBubble.tsx    # 消息气泡
│   │   ├── SettingsPanel.tsx    # 参数设置面板
│   │   └── ImagePreviewModal.tsx # 图片预览模态框
│   ├── services/         # API 服务
│   │   └── api.ts
│   ├── store/            # 状态管理
│   │   └── index.ts
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server.py             # FLUX 后端服务
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── .env.example          # 环境变量模板
└── .gitignore
```

## 快速开始

### 1. 环境配置

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Sensenova API Key (必需)
VITE_SENSENOVA_API_KEY=sk-your-api-key-here

# FLUX API Server URL (默认配置)
VITE_FLUX_API_URL=http://192.168.199.107:8787
```

### 2. 前端启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 3. FLUX 后端部署 (可选)

如果你需要使用 FLUX 模型，需要在 GPU 服务器上部署后端：

```bash
# 安装 Python 依赖
pip install fastapi uvicorn python-multipart modelscope torch pillow

# 配置模型路径（可选）
export KLEIN_MODEL_PATH=/path/to/your/FLUX.2-klein-9B

# 启动服务
python server.py
```

FLUX 后端会在 `http://0.0.0.0:8787` 启动。

## 使用说明

### 选择模型

1. 在左侧边栏点击模型名称即可切换
2. 每个模型都有独特的配色方案
3. 聊天历史按模型分组，切换模型不会丢失对话

### 图像生成 (FLUX)

1. 选择 **FLUX.2 Klein 9B** 模型
2. 在左侧设置面板调整参数：
   - 图像宽度/高度
   - 推理步数
   - 引导强度
3. 输入提示词，点击发送或按 Enter
4. 生成的图片可以点击放大查看和下载

### 图像理解 (Sensenova 6.7)

1. 选择 **Sensenova 6.7 Flash Lite** 模型
2. 点击上传区域或拖拽图片到输入框
3. 可以上传多张图片
4. 输入问题，模型会基于图片内容回答

### 深度思考 (DeepSeek)

1. 选择 **DeepSeek V4 Flash** 模型
2. 在左侧设置中可以：
   - 开启/关闭思考模式
   - 调节思考强度 (高/低)
   - 调整温度和最大 Token 数
3. 模型会先显示思考过程，再给出最终答案

## API 接口 (FLUX 后端)

### 生成图片

```http
POST /generate
Content-Type: application/json

{
  "prompt": "A cat holding a sign that says hello world",
  "height": 1024,
  "width": 1024,
  "guidance_scale": 1.0,
  "num_inference_steps": 4,
  "seed": 42
}
```

### 编辑图片

```http
POST /edit
Content-Type: application/json

{
  "prompt": "Make it look like sunset",
  "image_paths": ["/uploads/image_123.png"],
  "height": 1024,
  "width": 1024,
  "strength": 0.8
}
```

### 上传图片

```http
POST /upload-images
Content-Type: multipart/form-data
```

### 健康检查

```http
GET /health
```

## 注意事项

1. **密钥安全** - `.env` 文件已被 `.gitignore` 忽略，不要提交到仓库
2. **FLUX 后端** - 确保后端服务运行且网络可达
3. **浏览器刷新** - 修改 `.env` 后需要重启开发服务器并刷新浏览器
4. **流式响应** - 保持连接稳定以获得完整的流式体验

## 开发

### 推荐的开发工作流

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 在浏览器打开 http://localhost:5173
```

### 代码规范

- 使用 TypeScript 严格类型检查
- 组件保持单一职责
- 遵循 Tailwind CSS 的原子化风格

## License

MIT License
