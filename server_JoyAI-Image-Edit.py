import os
import uuid
import time
import torch
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Union
from PIL import Image

# 配置 JoyAI 模型路径
JOYAI_MODEL_ROOT = os.environ.get(
    "JOYAI_MODEL_ROOT",
    "/home1/zhanghui/models/jd-opensource/JoyAI-Image-Edit"
)

OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "joyai_generated_images"
)
UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "joyai_uploaded_images"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="JoyAI Image Edit API - 图像理解、文生图、图像编辑、空间变换")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/joyai-images", StaticFiles(directory=OUTPUT_DIR), name="joyai-images")
app.mount("/joyai-uploads", StaticFiles(directory=UPLOAD_DIR), name="joyai-uploads")

# 全局变量存储模型
joyai_model = None


# ====================================
# 请求数据模型
# ====================================

class BaseGenerationRequest(BaseModel):
    prompt: str
    seed: Optional[int] = None
    steps: int = 30
    guidance_scale: float = 4.0
    basesize: int = 1024


class TextToImageRequest(BaseGenerationRequest):
    negative_prompt: Optional[str] = ""


class ImageEditRequest(BaseGenerationRequest):
    image_path: str
    strength: float = 0.8


class ImageUnderstandingRequest(BaseModel):
    image_path: str
    question: Optional[str] = "描述这张图片的内容"


class SpatialTransformRequest(BaseModel):
    image_path: str
    operation_type: str  # "move", "rotate", "zoom", "pan", "tilt"
    object_prompt: Optional[str] = ""  # 需要操作的物体描述
    # 移动操作参数
    move_dx: Optional[float] = 0.0  # 水平移动距离
    move_dy: Optional[float] = 0.0  # 垂直移动距离
    # 旋转操作参数
    rotate_angle: Optional[float] = 0.0  # 旋转角度
    # 缩放操作参数
    zoom_factor: Optional[float] = 1.0  # 缩放倍数
    # 平移/倾斜/镜头参数
    pan_angle: Optional[float] = 0.0
    tilt_angle: Optional[float] = 0.0
    seed: Optional[int] = None
    steps: int = 30
    guidance_scale: float = 4.0
    basesize: int = 1024


# ====================================
# 模型加载
# ====================================

@app.on_event("startup")
def load_model():
    global joyai_model
    print("Loading JoyAI Image Edit model...")
    try:
        # 这里我们使用占位符，实际根据 JoyAI 官方实现来加载
        # 实际项目中，根据 JoyAI 的 inference.py 来集成
        print(f"Model root: {JOYAI_MODEL_ROOT}")
        
        # 示例加载逻辑（需要根据实际 JoyAI 的接口调整）
        # from joyai import JoyAIPipeline
        # joyai_model = JoyAIPipeline.from_pretrained(JOYAI_MODEL_ROOT)
        
        joyai_model = "loaded"  # 占位符
        print("JoyAI model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        joyai_model = None


# ====================================
# 工具函数
# ====================================

def get_timestamp_filename(prefix="joyai", suffix="png"):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:6]
    return f"{prefix}_{timestamp}_{unique_id}.{suffix}"


def load_image_from_path(image_path: str):
    relative_name = image_path.replace("/joyai-uploads/", "")
    full_path = os.path.join(UPLOAD_DIR, relative_name)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {relative_name}")
    return Image.open(full_path).convert("RGB")


def get_generator(seed: Optional[int] = None):
    generator = torch.Generator(device="cpu")
    if seed is not None:
        generator = generator.manual_seed(seed)
    else:
        generator = generator.manual_seed(int(time.time() * 1000) % (2**32))
    return generator


# ====================================
# 基础接口
# ====================================

@app.post("/joyai/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    uploaded_files = []
    for file in files:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:6]
        filename = f"joyai_upload_{timestamp}_{unique_id}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        uploaded_files.append({
            "filename": filename,
            "url": f"/joyai-uploads/{filename}",
        })

    return {"uploaded_files": uploaded_files}


@app.get("/joyai/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": joyai_model is not None,
        "model_root": JOYAI_MODEL_ROOT
    }


# ====================================
# 1. 文生图
# ====================================

@app.post("/joyai/text-to-image")
def text_to_image(req: TextToImageRequest):
    if joyai_model is None:
        raise HTTPException(status_code=503, detail="Model is still loading, please wait.")

    filename = get_timestamp_filename("joyai_t2i")
    filepath = os.path.join(OUTPUT_DIR, filename)

    # 这里需要根据 JoyAI 的实际接口调用
    # 示例逻辑：
    # image = joyai_model.text_to_image(
    #     prompt=req.prompt,
    #     negative_prompt=req.negative_prompt,
    #     steps=req.steps,
    #     guidance_scale=req.guidance_scale,
    #     basesize=req.basesize,
    #     seed=req.seed
    # )

    # 临时占位 - 实际项目需要替换为真实的模型调用
    image = Image.new('RGB', (req.basesize, req.basesize), color='gray')
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(image)
    draw.text((50, 50), f"JoyAI T2I: {req.prompt[:30]}", fill='white')

    image.save(filepath)

    return {
        "filename": filename,
        "url": f"/joyai-images/{filename}",
        "prompt": req.prompt,
        "seed": req.seed,
        "operation": "text-to-image"
    }


# ====================================
# 2. 图像编辑
# ====================================

@app.post("/joyai/edit-image")
def edit_image(req: ImageEditRequest):
    if joyai_model is None:
        raise HTTPException(status_code=503, detail="Model is still loading, please wait.")

    input_image = load_image_from_path(req.image_path)

    filename = get_timestamp_filename("joyai_edit")
    filepath = os.path.join(OUTPUT_DIR, filename)

    # 示例逻辑：
    # image = joyai_model.edit_image(
    #     image=input_image,
    #     prompt=req.prompt,
    #     strength=req.strength,
    #     steps=req.steps,
    #     guidance_scale=req.guidance_scale,
    #     basesize=req.basesize,
    #     seed=req.seed
    # )

    # 临时占位
    image = Image.new('RGB', input_image.size, color='lightblue')
    image.paste(input_image, (0, 0))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(image)
    draw.text((50, 50), f"JoyAI Edit: {req.prompt[:30]}", fill='black')

    image.save(filepath)

    return {
        "filename": filename,
        "url": f"/joyai-images/{filename}",
        "prompt": req.prompt,
        "source_image": req.image_path,
        "seed": req.seed,
        "operation": "edit-image"
    }


# ====================================
# 3. 图像理解
# ====================================

@app.post("/joyai/understand-image")
def understand_image(req: ImageUnderstandingRequest):
    if joyai_model is None:
        raise HTTPException(status_code=503, detail="Model is still loading, please wait.")

    input_image = load_image_from_path(req.image_path)

    # 示例逻辑：
    # description = joyai_model.understand_image(
    #     image=input_image,
    #     question=req.question
    # )

    # 临时占位
    description = "这是一张示例图片。图片中包含一些物体，场景看起来很有趣。"

    return {
        "image_path": req.image_path,
        "question": req.question,
        "description": description,
        "operation": "understand-image"
    }


# ====================================
# 4. 空间变换
# ====================================

@app.post("/joyai/spatial-transform")
def spatial_transform(req: SpatialTransformRequest):
    if joyai_model is None:
        raise HTTPException(status_code=503, detail="Model is still loading, please wait.")

    input_image = load_image_from_path(req.image_path)

    filename = get_timestamp_filename(f"joyai_{req.operation_type}")
    filepath = os.path.join(OUTPUT_DIR, filename)

    # 根据不同操作类型处理
    # 示例逻辑：
    # image = joyai_model.spatial_transform(
    #     image=input_image,
    #     operation_type=req.operation_type,
    #     object_prompt=req.object_prompt,
    #     move_dx=req.move_dx,
    #     move_dy=req.move_dy,
    #     rotate_angle=req.rotate_angle,
    #     zoom_factor=req.zoom_factor,
    #     pan_angle=req.pan_angle,
    #     tilt_angle=req.tilt_angle,
    #     steps=req.steps,
    #     guidance_scale=req.guidance_scale,
    #     basesize=req.basesize,
    #     seed=req.seed
    # )

    # 临时占位
    image = Image.new('RGB', input_image.size, color='lightgreen')
    image.paste(input_image, (0, 0))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(image)
    draw.text((50, 50), f"JoyAI {req.operation_type}", fill='black')

    image.save(filepath)

    return {
        "filename": filename,
        "url": f"/joyai-images/{filename}",
        "source_image": req.image_path,
        "operation": "spatial-transform",
        "operation_type": req.operation_type,
        "object_prompt": req.object_prompt,
        "seed": req.seed
    }


# ====================================
# 快捷操作端点
# ====================================

@app.post("/joyai/move-object")
def move_object(
    image_path: str,
    object_prompt: str,
    dx: float,
    dy: float,
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    """物体移动"""
    req = SpatialTransformRequest(
        image_path=image_path,
        operation_type="move",
        object_prompt=object_prompt,
        move_dx=dx,
        move_dy=dy,
        seed=seed,
        steps=steps,
        guidance_scale=guidance_scale
    )
    return spatial_transform(req)


@app.post("/joyai/rotate-object")
def rotate_object(
    image_path: str,
    object_prompt: str,
    angle: float,
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    """物体旋转"""
    req = SpatialTransformRequest(
        image_path=image_path,
        operation_type="rotate",
        object_prompt=object_prompt,
        rotate_angle=angle,
        seed=seed,
        steps=steps,
        guidance_scale=guidance_scale
    )
    return spatial_transform(req)


@app.post("/joyai/zoom")
def zoom_image(
    image_path: str,
    factor: float,
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    """缩放/镜头推拉"""
    req = SpatialTransformRequest(
        image_path=image_path,
        operation_type="zoom",
        zoom_factor=factor,
        seed=seed,
        steps=steps,
        guidance_scale=guidance_scale
    )
    return spatial_transform(req)


@app.post("/joyai/pan-tilt")
def pan_tilt(
    image_path: str,
    pan_angle: float = 0.0,
    tilt_angle: float = 0.0,
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    """镜头平移和倾斜"""
    req = SpatialTransformRequest(
        image_path=image_path,
        operation_type="pan-tilt",
        pan_angle=pan_angle,
        tilt_angle=tilt_angle,
        seed=seed,
        steps=steps,
        guidance_scale=guidance_scale
    )
    return spatial_transform(req)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8788)
