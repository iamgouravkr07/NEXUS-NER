import os
import uuid
import time
from pathlib import Path
from typing import Any
from fastapi import HTTPException, status

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Store uploads inside backend/uploads/reports
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "reports"


def save_report_photo(file: Any) -> str:
    """
    Validate, sanitize, and persist an uploaded report photo to disk.
    Returns the relative URL path for the saved image: '/uploads/reports/{filename}'.
    Protects against path traversal by generating a strictly randomized UUID filename.
    """
    def _close_file():
        try:
            if hasattr(file, "file"):
                file.file.close()
        except Exception:
            pass

    if not hasattr(file, "filename") or not file.filename:
        _close_file()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename."
        )

    # Validate extension safely using Path.suffix
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        _close_file()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Validate content-type if provided
    if hasattr(file, "content_type") and file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        _close_file()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image MIME type '{file.content_type}'."
        )

    # Ensure upload directory exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Secure random filename: report_{uuid}_{timestamp}{ext} - immune to path traversal
    safe_filename = f"report_{uuid.uuid4().hex}_{int(time.time())}{ext}"
    dest_path = UPLOAD_DIR / safe_filename

    # Write file content safely in chunks, enforcing size limit
    total_size = 0
    try:
        with open(dest_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):  # 1MB chunks
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    buffer.close()
                    if dest_path.exists():
                        dest_path.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB."
                    )
                buffer.write(chunk)
    finally:
        try:
            file.file.close()
        except Exception:
            pass

    return f"/uploads/reports/{safe_filename}"
