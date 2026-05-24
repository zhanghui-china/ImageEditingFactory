import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass, asdict
import base64

BASE_DIR = Path(__file__).parent
HISTORY_DIR = BASE_DIR / "history_records"
HISTORY_DIR.mkdir(exist_ok=True)

DB_PATH = HISTORY_DIR / "history.db"
IMAGES_DIR = HISTORY_DIR / "images"
IMAGES_DIR.mkdir(exist_ok=True)

@dataclass
class HistoryRecord:
    id: int
    model: str
    generate_type: str
    prompt: str
    request_images: List[str]
    response_result: str
    response_images: List[str]
    request_time: str
    response_time: str
    duration_ms: int
    
    def to_dict(self):
        return asdict(self)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            generate_type TEXT NOT NULL,
            prompt TEXT,
            request_images TEXT,
            response_result TEXT,
            response_images TEXT,
            request_time TEXT NOT NULL,
            response_time TEXT NOT NULL,
            duration_ms INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def save_history(
    model: str,
    generate_type: str,
    prompt: str,
    request_images: List[str],
    response_result: str,
    response_images: List[str],
    request_time: str,
    response_time: str,
    duration_ms: int
) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO history 
        (model, generate_type, prompt, request_images, response_result, 
         response_images, request_time, response_time, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        model,
        generate_type,
        prompt,
        json.dumps(request_images),
        response_result,
        json.dumps(response_images),
        request_time,
        response_time,
        duration_ms
    ))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id

def query_history(
    model: Optional[str] = None,
    generate_type: Optional[str] = None,
    prompt_keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[HistoryRecord]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    conditions = []
    params = []
    
    if model:
        conditions.append("model = ?")
        params.append(model)
    
    if generate_type:
        conditions.append("generate_type = ?")
        params.append(generate_type)
    
    if prompt_keyword:
        conditions.append("prompt LIKE ?")
        params.append(f"%{prompt_keyword}%")
    
    if start_date:
        conditions.append("request_time >= ?")
        params.append(start_date)
    
    if end_date:
        conditions.append("request_time <= ?")
        params.append(end_date)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    cursor.execute(f"""
        SELECT id, model, generate_type, prompt, request_images, 
               response_result, response_images, request_time, 
               response_time, duration_ms
        FROM history
        WHERE {where_clause}
        ORDER BY request_time DESC
        LIMIT ? OFFSET ?
    """, (*params, limit, offset))
    
    rows = cursor.fetchall()
    conn.close()
    
    records = []
    for row in rows:
        records.append(HistoryRecord(
            id=row[0],
            model=row[1],
            generate_type=row[2],
            prompt=row[3],
            request_images=json.loads(row[4]) if row[4] else [],
            response_result=row[5],
            response_images=json.loads(row[6]) if row[6] else [],
            request_time=row[7],
            response_time=row[8],
            duration_ms=row[9]
        ))
    
    return records

def get_history_by_id(history_id: int) -> Optional[HistoryRecord]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, model, generate_type, prompt, request_images, 
               response_result, response_images, request_time, 
               response_time, duration_ms
        FROM history
        WHERE id = ?
    """, (history_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return HistoryRecord(
            id=row[0],
            model=row[1],
            generate_type=row[2],
            prompt=row[3],
            request_images=json.loads(row[4]) if row[4] else [],
            response_result=row[5],
            response_images=json.loads(row[6]) if row[6] else [],
            request_time=row[7],
            response_time=row[8],
            duration_ms=row[9]
        )
    return None

def delete_history(history_id: int) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM history WHERE id = ?", (history_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def save_image(image_data: str, prefix: str = "img") -> str:
    if image_data.startswith("data:"):
        header, data = image_data.split(",", 1)
        if "image/png" in header:
            ext = "png"
        elif "image/jpeg" in header or "image/jpg" in header:
            ext = "jpg"
        else:
            ext = "jpg"
    else:
        ext = "png"
        data = image_data
    
    try:
        image_bytes = base64.b64decode(data)
    except:
        return None
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{prefix}_{timestamp}.{ext}"
    filepath = IMAGES_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    
    return f"/api/history/images/{filename}"

def get_image_path(filename: str) -> Optional[str]:
    filepath = IMAGES_DIR / filename
    if filepath.exists():
        return str(filepath)
    return None

init_db()
