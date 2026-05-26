import os
import uuid
import time
import torch
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from PIL import Image
from modelscope import Flux2KleinPipeline

KLEIN_MODEL_PATH = os.environ.get("KLEIN_MODEL_PATH", "/home1/zhanghui/models/black-forest-labs/FLUX.2-klein-9B")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generated_images")
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploaded_images")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Flux Klein Image Generation & Editing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/images", StaticFiles(directory=OUTPUT_DIR), name="images")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

pipe = None


class GenerateRequest(BaseModel):
    prompt: str
    height: int = 1024
    width: int = 1024
    guidance_scale: float = 1.0
    num_inference_steps: int = 4
    seed: int | None = None


class EditRequest(BaseModel):
    prompt: str
    image_paths: List[str]
    height: int = 1024
    width: int = 1024
    guidance_scale: float = 1.0
    num_inference_steps: int = 4
    seed: int | None = None
    strength: float = 0.8


@app.on_event("startup")
def load_model():
    global pipe
    print("Loading Flux Klein model...")
    pipe = Flux2KleinPipeline.from_pretrained(KLEIN_MODEL_PATH, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()
    print("Model loaded successfully.")


@app.post("/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    uploaded_files = []
    for file in files:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:6]
        filename = f"upload_{timestamp}_{unique_id}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        uploaded_files.append({
            "filename": filename,
            "url": f"/uploads/{filename}",
        })

    return {"uploaded_files": uploaded_files}


@app.post("/generate")
def generate_image(req: GenerateRequest):
    if pipe is None:
        raise HTTPException(status_code=503, detail="Model is still loading, please wait.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:6]
    filename = f"flux_{timestamp}_{unique_id}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)

    generator = torch.Generator(device="cpu")
    if req.seed is not None:
        generator = generator.manual_seed(req.seed)
    else:
        generator = generator.manual_seed(int(time.time() * 1000) % (2**32))

    image = pipe(
        prompt=req.prompt,
        height=req.height,
        width=req.width,
        guidance_scale=req.guidance_scale,
        num_inference_steps=req.num_inference_steps,
        generator=generator,
    ).images[0]

    image.save(filepath)

    return {
        "filename": filename,
        "url": f"/images/{filename}",
        "prompt": req.prompt,
        "seed": req.seed,
    }


@app.post("/edit")
def edit_image(req: EditRequest):
    if pipe is None:
        raise HTTPException(status_code=503, detail="Model is still loading, please wait.")

    if len(req.image_paths) == 0:
        raise HTTPException(status_code=400, detail="No images provided for editing")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:6]
    filename = f"flux_edit_{timestamp}_{unique_id}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)

    generator = torch.Generator(device="cpu")
    if req.seed is not None:
        generator = generator.manual_seed(req.seed)
    else:
        generator = generator.manual_seed(int(time.time() * 1000) % (2**32))

    input_images = []
    for img_path in req.image_paths:
        relative_name = img_path.replace("/uploads/", "")
        full_path = os.path.join(UPLOAD_DIR, relative_name)
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail=f"Image not found: {relative_name}")
        img = Image.open(full_path).convert("RGB")
        input_images.append(img)

    pipe_kwargs = {
        "prompt": req.prompt,
        "height": req.height,
        "width": req.width,
        "guidance_scale": req.guidance_scale,
        "num_inference_steps": req.num_inference_steps,
        "generator": generator,
    }

    if len(input_images) == 1:
        pipe_kwargs["image"] = input_images[0]
    elif len(input_images) > 1:
        pipe_kwargs["image"] = input_images

    try:
        image = pipe(**pipe_kwargs).images[0]
    except TypeError:
        pipe_kwargs.pop("image", None)
        image = pipe(**pipe_kwargs).images[0]

    image.save(filepath)

    return {
        "filename": filename,
        "url": f"/images/{filename}",
        "prompt": req.prompt,
        "source_images": req.image_paths,
        "seed": req.seed,
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": pipe is not None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8787)
