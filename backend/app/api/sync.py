import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse
from app.services import sync_service

logger = logging.getLogger("nexus_ner.sync")

router = APIRouter(prefix="/sync", tags=["Offline Synchronization"])


@router.post(
    "/batch",
    response_model=SyncBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Synchronize offline field reports and telemetry",
)
def synchronize_batch(
    batch_req: SyncBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingest a batch of offline captured events (incident reports, vehicle GPS updates).
    Provides:
    - Authoritative per-event idempotency (duplicate client_id returns 'already_synced').
    - Isolated transaction savepoints (one failing event does not abort the batch).
    - Per-event status reporting (success, already_synced, error).
    - Full audit logging tied to authenticated user.
    """
    if not batch_req.events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch must contain at least 1 event",
        )

    try:
        response = sync_service.process_sync_batch(
            db=db,
            batch_req=batch_req,
            current_user=current_user,
        )
        return response
    except Exception as exc:
        logger.error("Critical failure during batch synchronization: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal synchronization error",
        )
