from dataclasses import dataclass
from datetime import datetime, timezone
import io
import logging
from pathlib import Path
from typing import Any
import uuid

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status

from app import config

logger = logging.getLogger("nexus_ner.photo_storage")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@dataclass
class PhotoUploadResult:
    photo_url: str
    photo_public_id: str
    content_type: str


def is_cloudinary_configured() -> bool:
    return bool(
        config.CLOUDINARY_CLOUD_NAME
        and config.CLOUDINARY_API_KEY
        and config.CLOUDINARY_API_SECRET
    )


def configure_cloudinary() -> None:
    if is_cloudinary_configured():
        cloudinary.config(
            cloud_name=config.CLOUDINARY_CLOUD_NAME,
            api_key=config.CLOUDINARY_API_KEY,
            api_secret=config.CLOUDINARY_API_SECRET,
            secure=True,
        )


def validate_image_magic_bytes(content: bytes) -> str:
    """
    Validate that file content begins with genuine magic bytes for JPEG, PNG, or WebP.
    Returns the detected canonical MIME type.
    """
    if len(content) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is too small or corrupted to be a valid image.",
        )

    # JPEG: starts with \xff\xd8\xff
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    # PNG: starts with \x89PNG\r\n\x1a\n
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    # WebP: starts with RIFF and has WEBP at offset 8..12
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "image/webp"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid image content. Only valid JPEG, PNG, and WebP images are allowed.",
    )


def generate_public_id() -> str:
    """
    Generates server-side Cloudinary public_id formatted as:
    reports/{year}/{month}/{uuid}
    Never uses the user's filename as the storage path.
    """
    now = datetime.now(timezone.utc)
    year = now.strftime("%Y")
    month = now.strftime("%m")
    unique_id = uuid.uuid4().hex
    return f"reports/{year}/{month}/{unique_id}"


def upload_report_photo(file: Any) -> PhotoUploadResult:
    """
    Validate, sanitize, and upload an uploaded public report photo directly to Cloudinary.
    Enforces:
    - JPEG, PNG, WebP only (extension and magic bytes)
    - 10MB maximum file size
    - Server-side UUID public_id under reports/{year}/{month}/{uuid}
    - Direct Cloudinary HTTPS URL generation
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
            detail="Uploaded file must have a filename.",
        )

    # Validate extension safely
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        _close_file()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Validate content-type header if present
    if hasattr(file, "content_type") and file.content_type:
        header_mime = file.content_type.lower()
        if header_mime not in ALLOWED_CONTENT_TYPES:
            _close_file()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image MIME type '{file.content_type}'.",
            )

    # Read content enforcing maximum file size
    content_chunks = []
    total_size = 0
    try:
        while chunk := file.file.read(1024 * 1024):  # 1MB chunks
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB.",
                )
            content_chunks.append(chunk)
    finally:
        _close_file()

    file_bytes = b"".join(content_chunks)

    # Validate actual image content via magic bytes
    detected_mime = validate_image_magic_bytes(file_bytes)

    # Check Cloudinary configuration
    if not is_cloudinary_configured():
        logger.error("Cloudinary storage is requested but credentials are not configured in environment.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary photo storage is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        )

    configure_cloudinary()
    public_id = generate_public_id()

    try:
        upload_result = cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            unique_filename=False,
            use_filename=False,
        )
    except Exception as upload_err:
        logger.error("Cloudinary upload failed: %s", upload_err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary upload failed. Please try again.",
        )

    photo_url = upload_result.get("secure_url") or upload_result.get("url")
    if not photo_url:
        logger.error("Cloudinary did not return a photo URL: %s", upload_result)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary did not return a valid photo URL.",
        )

    logger.info("Successfully uploaded public report photo to Cloudinary (public_id=%s)", public_id)
    return PhotoUploadResult(
        photo_url=photo_url,
        photo_public_id=public_id,
        content_type=detected_mime,
    )


# Alias for backward compatibility
save_report_photo = upload_report_photo
