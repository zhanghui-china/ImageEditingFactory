from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn

from history_service import (
    save_history,
    query_history,
    get_history_by_id,
    delete_history,
    save_image,
    get_image_path,
    HISTORY_DIR,
    IMAGES_DIR
)

app = FastAPI(title="Image Generation History API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

class SaveHistoryRequest(BaseModel):
    model: str
    generate_type: str
    prompt: str
    request_images: List[str] = []
    response_result: str
    response_images: List[str] = []
    request_time: str
    response_time: str
    duration_ms: int

class QueryHistoryRequest(BaseModel):
    model: Optional[str] = None
    generate_type: Optional[str] = None
    prompt_keyword: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = 50
    offset: int = 0

@app.get("/")
async def root():
    return {"message": "Image Generation History API", "version": "1.0.0"}

@app.post("/api/history/save")
async def api_save_history(request: SaveHistoryRequest):
    processed_request_images = []
    for img in request.request_images:
        if img.startswith("data:"):
            saved_path = save_image(img, "req")
            if saved_path:
                processed_request_images.append(saved_path)
        else:
            processed_request_images.append(img)
    
    processed_response_images = []
    for img in request.response_images:
        if img.startswith("data:"):
            saved_path = save_image(img, "resp")
            if saved_path:
                processed_response_images.append(saved_path)
        else:
            processed_response_images.append(img)
    
    record_id = save_history(
        model=request.model,
        generate_type=request.generate_type,
        prompt=request.prompt,
        request_images=processed_request_images,
        response_result=request.response_result,
        response_images=processed_response_images,
        request_time=request.request_time,
        response_time=request.response_time,
        duration_ms=request.duration_ms
    )
    
    return {"id": record_id, "message": "History saved successfully"}

@app.get("/api/history/query")
async def api_query_history(
    model: Optional[str] = Query(None),
    generate_type: Optional[str] = Query(None),
    prompt_keyword: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    records = query_history(
        model=model,
        generate_type=generate_type,
        prompt_keyword=prompt_keyword,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    
    return {
        "records": [r.to_dict() for r in records],
        "count": len(records),
        "limit": limit,
        "offset": offset
    }

@app.get("/api/history/{history_id}")
async def api_get_history(history_id: int):
    record = get_history_by_id(history_id)
    if not record:
        raise HTTPException(status_code=404, detail="History record not found")
    return record.to_dict()

@app.delete("/api/history/{history_id}")
async def api_delete_history(history_id: int):
    success = delete_history(history_id)
    if not success:
        raise HTTPException(status_code=404, detail="History record not found")
    return {"message": "History deleted successfully"}

@app.get("/api/history/images/{filename}")
async def serve_image(filename: str):
    filepath = get_image_path(filename)
    if not filepath:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(filepath)

@app.get("/api/models")
async def get_models():
    return {
        "models": [
            {"id": "sensenova-6.7-flash-lite", "name": "Sensenova 6.7 Flash Lite"},
            {"id": "deepseek-v4-flash", "name": "DeepSeek V4 Flash"},
            {"id": "sensenova-u1-fast", "name": "Sensenova U1 Fast"},
            {"id": "flux-klein", "name": "FLUX.2 Klein"},
            {"id": "joyai-image-edit", "name": "JoyAI Image Edit"},
            {"id": "hidream-o1-image", "name": "HiDream-O1-Image"}
        ]
    }

@app.get("/api/generate-types")
async def get_generate_types():
    return {
        "types": [
            {"id": "text-to-image", "name": "文生图"},
            {"id": "image-to-image", "name": "图生图"},
            {"id": "edit-image", "name": "图像编辑"},
            {"id": "understand-image", "name": "图像理解"},
            {"id": "spatial-transform", "name": "空间变换"},
            {"id": "subject-driven", "name": "主体驱动"},
            {"id": "chat", "name": "文本对话"}
        ]
    }

if __name__ == "__main__":
    print(f"History service starting...")
    print(f"Database: {HISTORY_DIR / 'history.db'}")
    print(f"Images directory: {IMAGES_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8789)
