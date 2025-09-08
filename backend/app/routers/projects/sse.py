import anyio
from ...realtime import sse as sse_backend

def notify(payload: dict) -> None:
    """Fire-and-forget SSE broadcast (works from sync routes)."""
    try:
        anyio.from_thread.run(sse_backend.broadcast, payload)
    except RuntimeError:
        import asyncio
        asyncio.create_task(sse_backend.broadcast(payload))
