import time
import threading
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """
    Lightweight, thread-safe in-memory sliding-window rate limiter.
    Does not require Redis or external infrastructure.
    Tracks timestamps per client IP and endpoint scope.
    """

    def __init__(self):
        self._lock = threading.Lock()
        # storage: { (scope, client_ip): [timestamp, timestamp, ...] }
        self._history: Dict[tuple, List[float]] = defaultdict(list)

    def check(
        self,
        request: Request,
        scope: str,
        limit: int,
        window_seconds: int = 60,
    ) -> None:
        """
        Check if request exceeds rate limit. Raises HTTP 429 if exceeded.
        Uses request.client.host safely to avoid header-spoofed IP bypasses.
        """
        client_ip = "127.0.0.1"
        if request.client and request.client.host:
            client_ip = request.client.host

        key = (scope, client_ip)
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            # Filter timestamps outside the active window
            recent_timestamps = [t for t in self._history[key] if t > window_start]
            
            if len(recent_timestamps) >= limit:
                oldest = recent_timestamps[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: maximum {limit} requests per {window_seconds}s for '{scope}'.",
                    headers={"Retry-After": str(retry_after)},
                )

            recent_timestamps.append(now)
            self._history[key] = recent_timestamps

    def reset(self) -> None:
        """Clear all rate limit state (primarily for test isolation)."""
        with self._lock:
            self._history.clear()


limiter = InMemoryRateLimiter()


def rate_limit(limit: int, window_seconds: int = 60, scope: Optional[str] = None):
    """
    FastAPI dependency factory for rate-limiting specific endpoints.
    Example: Depends(rate_limit(5, 60, "auth_login"))
    """
    def dependency(request: Request):
        endpoint_scope = scope or request.url.path
        limiter.check(request, scope=endpoint_scope, limit=limit, window_seconds=window_seconds)

    return dependency
