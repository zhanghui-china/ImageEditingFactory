import os
import uuid
import time
import torch
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image
from io import BytesIO

JOYAI_MODEL_ID = os.environ.get(
    "JOYAI_MODEL_ID",
    "jdopensource/JoyAI-Image-Edit-Diffusers"
)

JOYAI_MODEL_ROOT = os.environ.get(
    "JOYAI_MODEL_ROOT",
    None
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

joyai_pipeline = None
pipeline_loaded = False


class TextToImageRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    seed: Optional[int] = None
    steps: int = 30
    guidance_scale: float = 4.0
    height: int = 1024
    width: int = 1024


class ImageEditRequest(BaseModel):
    prompt: str
    image_path: str
    negative_prompt: str = ""
    seed: Optional[int] = None
    steps: int = 30
    guidance_scale: float = 4.0
    strength: float = 0.8


class ImageUnderstandingRequest(BaseModel):
    image_path: str
    question: str = "描述这张图片的内容"
    max_new_tokens: int = 1024
    temperature: float = 0.7


class SpatialTransformRequest(BaseModel):
    image_path: str
    operation_type: str
    object_prompt: Optional[str] = ""
    prompt: Optional[str] = None
    seed: Optional[int] = None
    steps: int = 30
    guidance_scale: float = 4.0
    move_dx: Optional[float] = 0.0
    move_dy: Optional[float] = 0.0
    rotate_angle: Optional[float] = 0.0
    zoom_factor: Optional[float] = 1.0
    zoom_direction: Optional[str] = "unchanged"
    pan_angle: Optional[float] = 0.0
    tilt_angle: Optional[float] = 0.0
    view: Optional[str] = None


def build_spatial_prompt(req: SpatialTransformRequest) -> str:
    if req.prompt:
        return req.prompt
    
    object_desc = req.object_prompt.strip() if req.object_prompt else "object"
    
    if req.operation_type == "move":
        return f"Move the {object_desc} into the red box and finally remove the red box."
    
    elif req.operation_type == "rotate":
        view_map = {
            "front": "front",
            "right": "right", 
            "left": "left",
            "rear": "rear",
            "back": "rear",
            "front_right": "front right",
            "front_left": "front left",
            "rear_right": "rear right",
            "rear_left": "rear left",
        }
        view = view_map.get(req.view or "front", "front")
        return f"Rotate the {object_desc} to show the {view} side view."
    
    elif req.operation_type == "zoom":
        direction = req.zoom_direction or "unchanged"
        return f"Move the camera.\n- Camera rotation: Yaw 0°, Pitch 0°.\n- Camera zoom: {direction}.\n- Keep the 3D scene static; only change the viewpoint."
    
    elif req.operation_type == "pan-tilt":
        yaw = req.pan_angle or 0
        pitch = req.tilt_angle or 0
        direction = req.zoom_direction or "unchanged"
        return f"Move the camera.\n- Camera rotation: Yaw {yaw}°, Pitch {pitch}°.\n- Camera zoom: {direction}.\n- Keep the 3D scene static; only change the viewpoint."
    
    return f"Edit the image: {object_desc}"


@app.on_event("startup")
def load_pipeline():
    global joyai_pipeline, pipeline_loaded
    print("Loading JoyAI Image Edit pipeline (Diffusers)...")
    print(f"Model ID: {JOYAI_MODEL_ID}")
    
    try:
        from diffusers import JoyImageEditPipeline
        
        if JOYAI_MODEL_ROOT and os.path.exists(JOYAI_MODEL_ROOT):
            print(f"Loading from local path: {JOYAI_MODEL_ROOT}")
            joyai_pipeline = JoyImageEditPipeline.from_pretrained(
                JOYAI_MODEL_ROOT,
                torch_dtype=torch.bfloat16
            )
        else:
            print(f"Loading from HuggingFace hub: {JOYAI_MODEL_ID}")
            joyai_pipeline = JoyImageEditPipeline.from_pretrained(
                JOYAI_MODEL_ID,
                torch_dtype=torch.bfloat16
            )
        
        if torch.cuda.is_available():
            joyai_pipeline = joyai_pipeline.to("cuda")
            print("Pipeline moved to CUDA")
        else:
            print("CUDA not available, using CPU")
        
        pipeline_loaded = True
        print("JoyAI Image Edit pipeline loaded successfully!")
        
    except Exception as e:
        print(f"Error loading pipeline: {e}")
        import traceback
        traceback.print_exc()
        pipeline_loaded = False


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


def get_generator(seed: Optional[int] = None, device: str = "cuda"):
    if torch.cuda.is_available() and device == "cuda":
        generator = torch.Generator(device="cuda")
    else:
        generator = torch.Generator(device="cpu")
    
    if seed is not None:
        generator = generator.manual_seed(seed)
    else:
        generator = generator.manual_seed(int(time.time() * 1000) % (2**32))
    
    return generator


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
        "pipeline_loaded": pipeline_loaded,
        "model_id": JOYAI_MODEL_ID,
        "model_root": JOYAI_MODEL_ROOT,
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
    }


@app.post("/joyai/text-to-image")
def text_to_image(req: TextToImageRequest):
    if not pipeline_loaded or joyai_pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline is still loading, please wait.")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = get_generator(req.seed, device)
    
    print(f"[T2I] Prompt: {req.prompt}")
    print(f"[T2I] Steps: {req.steps}, Guidance: {req.guidance_scale}")
    
    try:
        output = joyai_pipeline(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt if req.negative_prompt else None,
            height=req.height,
            width=req.width,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance_scale,
            generator=generator,
        )
        
        output_image = output.images[0]
        
        filename = get_timestamp_filename("joyai_t2i")
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)
        
        return {
            "filename": filename,
            "url": f"/joyai-images/{filename}",
            "prompt": req.prompt,
            "seed": req.seed,
            "operation": "text-to-image",
            "height": req.height,
            "width": req.width
        }
        
    except Exception as e:
        print(f"Error in text-to-image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.post("/joyai/edit-image")
def edit_image(req: ImageEditRequest):
    if not pipeline_loaded or joyai_pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline is still loading, please wait.")
    
    input_image = load_image_from_path(req.image_path)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = get_generator(req.seed, device)
    
    print(f"[Edit] Prompt: {req.prompt}")
    print(f"[Edit] Image: {req.image_path}")
    print(f"[Edit] Steps: {req.steps}, Guidance: {req.guidance_scale}, Strength: {req.strength}")
    
    try:
        output = joyai_pipeline(
            image=input_image,
            prompt=req.prompt,
            negative_prompt=req.negative_prompt if req.negative_prompt else None,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance_scale,
            strength=req.strength,
            generator=generator,
        )
        
        output_image = output.images[0]
        
        filename = get_timestamp_filename("joyai_edit")
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)
        
        return {
            "filename": filename,
            "url": f"/joyai-images/{filename}",
            "prompt": req.prompt,
            "source_image": req.image_path,
            "seed": req.seed,
            "operation": "edit-image"
        }
        
    except Exception as e:
        print(f"Error in edit-image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Editing failed: {str(e)}")


@app.post("/joyai/understand-image")
def understand_image(req: ImageUnderstandingRequest):
    if not pipeline_loaded or joyai_pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline is still loading, please wait.")
    
    input_image = load_image_from_path(req.image_path)
    
    print(f"[Understand] Question: {req.question}")
    print(f"[Understand] Image: {req.image_path}")
    
    try:
        output = joyai_pipeline(
            image=input_image,
            prompt=req.question,
            num_inference_steps=min(req.max_new_tokens // 4, 40),
            guidance_scale=1.0,
            max_new_tokens=req.max_new_tokens,
            output_type="text"
        )
        
        description = ""
        if hasattr(output, 'text'):
            description = output.text[0] if isinstance(output.text, list) else output.text
        elif hasattr(output, 'sequences'):
            description = output.sequences[0] if isinstance(output.sequences, list) else output.sequences
        
        if not description:
            description = "[Model did not return text output. Image understanding may require a separate understanding model.]"
        
        return {
            "image_path": req.image_path,
            "question": req.question,
            "description": description,
            "operation": "understand-image"
        }
        
    except Exception as e:
        print(f"Error in understand-image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Understanding failed: {str(e)}")


@app.post("/joyai/spatial-transform")
def spatial_transform(req: SpatialTransformRequest):
    if not pipeline_loaded or joyai_pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline is still loading, please wait.")
    
    input_image = load_image_from_path(req.image_path)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = get_generator(req.seed, device)
    
    prompt = build_spatial_prompt(req)
    
    print(f"[Spatial] Operation: {req.operation_type}")
    print(f"[Spatial] Prompt: {prompt}")
    print(f"[Spatial] Image: {req.image_path}")
    
    try:
        output = joyai_pipeline(
            image=input_image,
            prompt=prompt,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance_scale,
            generator=generator,
        )
        
        output_image = output.images[0]
        
        filename = get_timestamp_filename(f"joyai_{req.operation_type}")
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)
        
        return {
            "filename": filename,
            "url": f"/joyai-images/{filename}",
            "source_image": req.image_path,
            "operation": "spatial-transform",
            "operation_type": req.operation_type,
            "prompt": prompt,
            "seed": req.seed
        }
        
    except Exception as e:
        print(f"Error in spatial-transform: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Spatial transform failed: {str(e)}")


@app.post("/joyai/move-object")
def move_object(
    image_path: str,
    object_prompt: str,
    dx: float = 0.0,
    dy: float = 0.0,
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    prompt = f"Move the {object_prompt} into the red box and finally remove the red box."
    
    req = SpatialTransformRequest(
        image_path=image_path,
        operation_type="move",
        object_prompt=object_prompt,
        prompt=prompt,
        move_dx=dx,
        move_dy=dy,
        seed=seed,
        steps=steps,
        guidance_scale=guidance_scale
    )
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = get_generator(seed, device)
    
    input_image = load_image_from_path(image_path)
    
    print(f"[Move Object] Prompt: {prompt}")
    
    try:
        output = joyai_pipeline(
            image=input_image,
            prompt=prompt,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )
        
        output_image = output.images[0]
        
        filename = get_timestamp_filename("joyai_move")
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)
        
        return {
            "filename": filename,
            "url": f"/joyai-images/{filename}",
            "source_image": image_path,
            "operation": "move-object",
            "object_prompt": object_prompt,
            "prompt": prompt,
            "seed": seed
        }
        
    except Exception as e:
        print(f"Error in move-object: {e}")
        raise HTTPException(status_code=500, detail=f"Move object failed: {str(e)}")


@app.post("/joyai/rotate-object")
def rotate_object(
    image_path: str,
    object_prompt: str,
    view: str = "front",
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    view_map = {
        "front": "front",
        "right": "right",
        "left": "left",
        "rear": "rear",
        "back": "rear",
        "front_right": "front right",
        "front_left": "front left",
        "rear_right": "rear right",
        "rear_left": "rear left",
    }
    view_text = view_map.get(view.lower(), "front")
    prompt = f"Rotate the {object_prompt} to show the {view_text} side view."
    
    input_image = load_image_from_path(image_path)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = get_generator(seed, device)
    
    print(f"[Rotate Object] Prompt: {prompt}")
    
    try:
        output = joyai_pipeline(
            image=input_image,
            prompt=prompt,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )
        
        output_image = output.images[0]
        
        filename = get_timestamp_filename("joyai_rotate")
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)
        
        return {
            "filename": filename,
            "url": f"/joyai-images/{filename}",
            "source_image": image_path,
            "operation": "rotate-object",
            "object_prompt": object_prompt,
            "view": view,
            "prompt": prompt,
            "seed": seed
        }
        
    except Exception as e:
        print(f"Error in rotate-object: {e}")
        raise HTTPException(status_code=500, detail=f"Rotate object failed: {str(e)}")


@app.post("/joyai/zoom")
def zoom_image(
    image_path: str,
    direction: str = "in",
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    direction = direction.lower()
    if direction not in ["in", "out", "unchanged"]:
        direction = "unchanged"
    
    prompt = f"Move the camera.\n- Camera rotation: Yaw 0°, Pitch 0°.\n- Camera zoom: {direction}.\n- Keep the 3D scene static; only change the viewpoint."
    
    input_image = load_image_from_path(image_path)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = get_generator(seed, device)
    
    print(f"[Zoom] Prompt: {prompt}")
    
    try:
        output = joyai_pipeline(
            image=input_image,
            prompt=prompt,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )
        
        output_image = output.images[0]
        
        filename = get_timestamp_filename("joyai_zoom")
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)
        
        return {
            "filename": filename,
            "url": f"/joyai-images/{filename}",
            "source_image": image_path,
            "operation": "zoom",
            "direction": direction,
            "prompt": prompt,
            "seed": seed
        }
        
    except Exception as e:
        print(f"Error in zoom: {e}")
        raise HTTPException(status_code=500, detail=f"Zoom failed: {str(e)}")


@app.post("/joyai/pan-tilt")
def pan_tilt(
    image_path: str,
    yaw: float = 0.0,
    pitch: float = 0.0,
    zoom: str = "unchanged",
    seed: Optional[int] = None,
    steps: int = 30,
    guidance_scale: float = 4.0
):
    prompt = f"Move the camera.\n- Camera rotation: Yaw {yaw}°, Pitch {pitch}°.\n- Camera zoom: {zoom}.\n- Keep the 3D scene static; only change the viewpoint."
    
    input_image = load_image_from_path(image_path)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = get_generator(seed, device)
    
    print(f"[Pan-Tilt] Prompt: {prompt}")
    
    try:
        output = joyai_pipeline(
            image=input_image,
            prompt=prompt,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )
        
        output_image = output.images[0]
        
        filename = get_timestamp_filename("joyai_pantilt")
        filepath = os.path.join(OUTPUT_DIR, filename)
        output_image.save(filepath)
        
        return {
            "filename": filename,
            "url": f"/joyai-images/{filename}",
            "source_image": image_path,
            "operation": "pan-tilt",
            "yaw": yaw,
            "pitch": pitch,
            "zoom": zoom,
            "prompt": prompt,
            "seed": seed
        }
        
    except Exception as e:
        print(f"Error in pan-tilt: {e}")
        raise HTTPException(status_code=500, detail=f"Pan-tilt failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8788)
