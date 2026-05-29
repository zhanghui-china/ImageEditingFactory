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
| **JoyAI Image Edit** | 图像编辑 + 理解 + 空间变换 | 强大的图像编辑和理解模型，支持多种操作 |
| **HiDream-O1-Image** | 文生图 + 编辑 + 主体驱动 | Pixel-level 统一多模态模型 |
| **ERNIE-Image** | 文生图 | 百度文心文生图模型，支持 PE 增强 |
| **Qwen-Image-Edit-2511** | 图像编辑 | 通义千问图像编辑模型，支持高质量图像编辑和多图片批量处理 |
| **FireRed-Image-Edit** | 图像编辑 | FireRed 图像编辑模型，使用 vLLM-Omni 部署，支持高质量图像编辑 |

### 核心功能

- 🔄 **实时流式响应** - 所有模型都支持流式输出，实现打字机效果
- 🖼️ **多模态对话** - 支持上传图片进行多轮对话
- 🎨 **图像生成与编辑** - 完整的 FLUX 图像生成和编辑工作流
- 📱 **响应式设计** - 现代化 UI，支持各种屏幕尺寸
- 🔐 **环境变量配置** - 安全的 API Key 管理
- 📋 **历史查询** - 保存所有模型的交互历史，支持按模型和类型筛选
- ⏱️ **时间统计** - 显示每次交互的耗时
- 🔍 **可折叠参数面板** - 灵活的参数配置界面
- 💾 **图片持久化保存** - 所有生成的图片都会转换为 base64 格式保存到历史记录，确保刷新页面后仍能正常查看
- 📸 **多图片批量编辑** - Qwen-Image-Edit-2511 支持一次性上传和编辑多张图片

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
│   │   ├── ModelSelector.tsx        # 模型选择器
│   │   ├── ChatInterface.tsx        # 聊天界面
│   │   ├── InputArea.tsx            # 输入区域 (其他模型)
│   │   ├── ErnieInputArea.tsx       # 输入区域 (ERNIE-Image)
│   │   ├── QwenInputArea.tsx        # 输入区域 (Qwen-Image-Edit)
│   │   ├── FireRedInputArea.tsx     # 输入区域 (FireRed-Image-Edit)
│   │   ├── FluxInputArea.tsx        # 输入区域 (FLUX)
│   │   ├── JoyAIInputArea.tsx       # 输入区域 (JoyAI)
│   │   ├── HiDreamInputArea.tsx     # 输入区域 (HiDream)
│   │   ├── HistoryPanel.tsx         # 历史查询面板
│   │   ├── MessageBubble.tsx        # 消息气泡
│   │   ├── SettingsPanel.tsx        # 参数设置面板
│   │   ├── ImagePreviewModal.tsx    # 图片预览模态框
│   │   └── ApiKeyModal.tsx          # API Key 配置模态框
│   ├── services/         # API 服务
│   │   ├── api.ts                  # 主 API 服务
│   │   └── historyApi.ts           # 历史记录 API 服务
│   ├── store/            # 状态管理
│   │   └── index.ts
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/            # 工具函数
│   │   └── formatDuration.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── flux2/               # FLUX.2 后端服务
│   └── server.py
├── JoyAI-Image/         # JoyAI 后端服务
│   └── server_JoyAI-Image-Edit.py
├── HiDream-O1-Image/    # HiDream 后端服务
│   └── server_HiDream-01-Image.sh
├── Qwen-Image-Edit-2511/ # Qwen-Image-Edit 后端服务
│   └── test_Qwen-Image-Edit-2511_service.py
├── server_history.py    # 历史记录服务
├── history_service.py   # 历史记录数据库服务
├── public/
│   └── vite.svg
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.app.json
├── package.json
├── package-lock.json
├── index.html
├── .env.example         # 环境变量模板
├── .gitignore
├── start.bat            # Windows 启动脚本
└── start-dev.bat        # Windows 开发启动脚本
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
VITE_FLUX_API_URL=http://[DGX Spark IP]:8787
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

### 3. 后端服务部署 (可选)

根据你需要使用的模型，启动相应的后端服务：

#### 历史记录服务 (必需)

启动本地历史记录服务：

```bash
python server_history.py
```

服务会在 `http://0.0.0.0:8789` 启动，数据库和图片保存在 `history_records/` 目录中。

#### FLUX 后端

如果你需要使用 FLUX 模型，需要在 GPU 服务器上部署后端：

```bash
conda activate flux2

# 安装 Python 依赖
pip install fastapi uvicorn python-multipart modelscope torch pillow

# 配置模型路径（可选）
export KLEIN_MODEL_PATH=/path/to/your/FLUX.2-klein-9B

# 启动服务
cd ~/flux2
python server.py
```

FLUX 后端会在 `http://0.0.0.0:8787` 启动。

部署 FLUX.2-klein-9B：https://zhuanlan.zhihu.com/p/2041402789159556947

#### JoyAI 后端

```bash
conda activate joyai2

# 切换到 JoyAI 目录
cd ~/JoyAI-Image

# 安装依赖并启动 JoyAI 服务
python server_JoyAI-Image-Edit.py
```

服务会在 `http://0.0.0.0:8788` 启动。

部署 JoyAI-Image-Edit ：https://zhuanlan.zhihu.com/p/2026607079041897539

#### HiDream 后端

```bash
conda activate hidream

# 启动 HiDream 服务
cd ~/HiDream-O1-Image
./server_HiDream-01-Image.sh
```

服务会在 `http://0.0.0.0:7860` 启动。

部署 HiDream-O1-Image：https://zhuanlan.zhihu.com/p/2036964309499126264

#### ERNIE-Image 后端

```bash
conda activate ernie

# 启动 HiDream 服务
cd ~/HiDream-O1-Image
sglang serve --model-path /home1/zhanghui/models/PaddlePaddle/ERNIE-Image --host 0.0.0.0 --port 30000
```

服务会在 `http://0.0.0.0:30000` 启动。

部署 ERNIE-Image：https://zhuanlan.zhihu.com/p/2033537436198904369

#### Qwen-Image-Edit-2511 后端

```bash
conda activate qwenimage

# 安装依赖
pip install flask torch diffusers pillow

# 启动 Qwen 服务
cd ~/Qwen-Image-Edit-2511
python test_Qwen-Image-Edit-2511_service.py
```

服务会在 `http://0.0.0.0:5000` 启动。

部署 Qwen-Image-Edit-2511：https://zhuanlan.zhihu.com/p/2022011775193718931


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
   - 编辑强度（图生图模式）
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

### JoyAI 图像编辑

1. 选择 **JoyAI Image Edit** 模型
2. 选择生成模式：
   - **文生图** - 直接从文本生成图像
   - **图像编辑** - 基于原图进行编辑
   - **图像理解** - 分析和理解图像内容（支持多图比较）
   - **空间变换** - 移动、旋转、缩放图像中的对象
3. **图像理解模式**支持：
   - 上传单张或多张图片
   - 可以持续追加更多图片
   - 支持多张图片比较和分析
4. **空间变换模式**支持三种操作：
   - **物体移动** - 选择物体描述，自动生成提示词
   - **物体旋转** - 选择物体和目标视角，自动生成提示词
   - **相机控制** - 调整偏航、俯仰角度和缩放方向，自动生成多行提示词
5. 在空间变换模式下：
   - 调整左侧参数时，右侧输入框会**实时自动生成提示词**
   - 支持手动编辑提示词，系统会记住你的编辑状态
   - 发送后会重置编辑状态，可以重新开始
6. 其他模式根据需要调整参数，上传图片并输入提示词

### HiDream 图像生成

1. 选择 **HiDream-O1-Image** 模型
2. 选择生成模式：
   - **文生图** - 直接从文本生成高质量图像
   - **图像编辑** - 基于原图进行编辑
   - **主体驱动** - 基于参考图片生成新图像
3. 调整参数（尺寸、采样步数等）
4. 上传图片（如需要）并输入提示词

### ERNIE-Image

ERNIE-Image 是百度文心一格的文生图模型，需要后端服务支持。

**部署步骤：**

1. 在 GPU 服务器上启动 ERNIE-Image 后端服务：

```bash
# 确保服务运行在 http://192.168.199.107:30000
# 服务会自动处理 CORS 跨域问题
```

2. 在前端 `.env` 文件中配置服务器地址（如需要）

3. 使用说明：
   - 选择 **ERNIE-Image** 模型
   - 输入描述你想要生成的图片的提示词
   - 可以在左侧设置面板调整参数：
     - 图片宽度/高度
     - 推理步数
     - 引导强度
     - PE 增强开关
   - 点击发送生成图片

**注意：** ERNIE-Image 后端返回的是 OpenAI 格式的 JSON 响应，前端会自动解析并显示图片。生成的图片会以 base64 格式保存到历史记录中，确保刷新页面后仍能正常查看。

### Qwen-Image-Edit-2511

Qwen-Image-Edit-2511 是通义千问的图像编辑模型，支持高质量的图像编辑和多图片批量处理功能。

**部署步骤：**

1. 在 GPU 服务器上启动 Qwen-Image-Edit-2511 后端服务：

```bash
# 确保服务运行在 http://192.168.199.107:5000
# 服务会自动处理 CORS 跨域问题（通过 Vite 代理）
```

2. 在前端 `.env` 文件中配置服务器地址（如需要）

3. 使用说明：
   - 选择 **Qwen-Image-Edit-2511** 模型
   - 点击大上传区域或拖拽图片到上传框（**支持一次性选择或拖拽多张图片**）
   - 上传的图片会在顶部显示预览，支持水平滚动查看
   - 每张图片旁边都有删除按钮，可以单独移除
   - 可以继续追加更多图片，系统会保持已上传的图片
   - 输入描述你想要如何编辑这些图片的提示词（提示词会应用到所有图片）
   - 可以在左侧设置面板调整参数：
     - 推理步数
     - 引导强度
     - True CFG Scale
     - 随机种子
   - 点击发送编辑图片

**多图片编辑功能：**
- 支持批量处理多张图片，使用相同的提示词和参数
- 系统会依次处理每张图片，最终返回所有编辑后的图片
- 支持拖拽上传和文件选择器两种方式添加图片
- 友好的拖拽反馈效果，提升用户体验

**注意：** 
- Qwen-Image-Edit-2511 后端会返回所有图像编辑后的图片，前端会自动显示并保存到历史记录中
- 生成的图片会以 base64 格式保存，确保刷新页面后仍能正常查看
- 后端同时兼容单文件和多文件上传格式，保持向后兼容

### FireRed-Image-Edit

FireRed-Image-Edit 是 FireRed Team 开发的图像编辑模型，使用 vLLM-Omni 部署，支持高质量图像编辑功能。

**部署步骤：**

1. 在 GPU 服务器上使用 vLLM-Omni 启动 FireRed-Image-Edit 服务：

```bash
# 使用 vLLM-Omni 启动服务
# 服务默认运行在 http://192.168.199.107:8091
```

2. 在前端 `.env` 文件中配置服务器地址（如需要）

```env
VITE_FIRERED_API_URL=http://192.168.199.107:8091
```

3. 使用说明：
   - 选择 **FireRed-Image-Edit** 模型
   - 点击上传区域或拖拽图片到上传框（支持多张图片）
   - 上传的图片会在顶部显示预览，支持水平滚动查看
   - 每张图片旁边都有删除按钮，可以单独移除
   - 输入描述你想要如何编辑这些图片的提示词
   - 可以在左侧设置面板调整参数：
     - 推理步数
     - 引导强度
     - 随机种子
   - 点击"编辑"按钮开始生成
   - 生成过程中可以点击"停止"按钮随时中断

**API 格式：**
FireRed-Image-Edit 使用 OpenAI 兼容的聊天完成 API 格式，支持多模态输入（图片+文本）。

**注意事项：**
- 图片在前，文本在后的输入顺序
- 后端返回 OpenAI 兼容格式的响应
- 生成的图片会直接以 base64 格式返回
- 前端通过 Vite 代理解决 CORS 跨域问题

### 历史查询

1. 点击右上角的 "历史查询" 按钮
2. 可以使用筛选功能：
   - 按模型筛选
   - 按生成方式筛选
   - 按关键词搜索 prompt
3. 点击展开查看详细信息：
   - 请求 prompt
   - 请求图片
   - 响应结果
   - 响应图片
   - 请求和响应时间
   - 耗时统计
4. 点击图片可以在新标签页中打开
5. 可以删除不需要的历史记录

## API 接口

### FLUX 后端

#### 生成图片

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

#### 编辑图片

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

### FLUX FLUX FLUX

### Qwen-Image-Edit-2511 后端

#### 编辑图片

```http
POST /edit_image
Content-Type: multipart/form-data

Parameters:
  files: multiple image files (支持多图片上传)
  file: single image file (向后兼容，支持单图片上传)
  prompt: text prompt
  num_inference_steps: optional, default 40
  guidance_scale: optional, default 1.0
  true_cfg_scale: optional, default 4.0
  seed: optional, default 0

Example curl (多图片上传):
curl -X POST http://192.168.199.107:5000/edit_image \
  -F "files=@image1.png" \
  -F "files=@image2.png" \
  -F "prompt=generate a christmas theme"

Example curl (单图片上传，向后兼容):
curl -X POST http://192.168.199.107:5000/edit_image \
  -F "file=@image.png" \
  -F "prompt=generate a christmas theme"
```

#### 获取生成的图片

```http
GET /outputs/{filename}
```

#### 健康检查

```http
GET /health
```

## 注意事项

1. **密钥安全** - `.env` 文件已被 `.gitignore` 忽略，不要提交到仓库
2. **FLUX 后端** - 确保后端服务运行且网络可达
3. **浏览器刷新** - 修改 `.env` 后需要重启开发服务器并刷新浏览器
4. **流式响应** - 保持连接稳定以获得完整的流式体验
5. **图片保存** - 所有生成的图片都会自动转换为 base64 格式保存到历史记录，即使刷新页面也能正常查看
6. **跨域问题** - 前端通过 Vite 代理配置解决所有后端服务的 CORS 跨域问题，无需后端配置 CORS

## 故障排除

### 图片无法保存或显示

如果历史记录中的图片无法正常显示，可能是以下原因：

1. **图片还在生成中** - 等待图片完全生成后再查看
2. **网络问题** - 确保开发服务器和后端服务都正常运行
3. **代理配置** - 检查 `vite.config.ts` 中的代理配置是否正确

**解决方案：**

- 重启前端开发服务器：`npm run dev`
- 确保后端服务正在运行
- 检查浏览器控制台是否有错误信息
- 清除浏览器缓存后重试

### CORS 跨域错误

如果遇到跨域错误，确保：

1. `vite.config.ts` 中已配置对应的代理规则
2. 后端服务已启动并可访问
3. 代理目标地址正确（检查 IP 和端口）

### 后端服务连接失败

1. 检查后端服务是否启动
2. 验证 IP 地址和端口配置
3. 确保防火墙允许相应端口的访问
4. 测试后端服务是否可访问：`curl http://192.168.199.107:8787/health`

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
