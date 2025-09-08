# app/realtime.py
from __future__ import annotations
import asyncio
import json
from typing import Set
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

class SSEManager:
    def __init__(self) -> None:
        self.clients: Set[asyncio.Queue[str]] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue[str]:
        q: asyncio.Queue[str] = asyncio.Queue()
        async with self._lock:
            self.clients.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue[str]) -> None:
        async with self._lock:
            self.clients.discard(q)

    async def broadcast(self, data: dict) -> None:
        payload = json.dumps(data, default=str)
        async with self._lock:
            targets = list(self.clients)
        for q in targets:
            # prevent slow-client buildup
            if q.qsize() > 100:
                try:
                    q.get_nowait()
                except Exception:
                    pass
            await q.put(f"data: {payload}\n\n")

sse = SSEManager()
router = APIRouter()

@router.get("/stream")
async def stream(request: Request):
    q = await sse.subscribe()

    async def gen():
        try:
            yield f": connected {datetime.now(timezone.utc).isoformat()}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=25)
                    yield msg
                except asyncio.TimeoutError:
                    # keep-alive comment (OK by SSE spec)
                    yield f": ping {datetime.now(timezone.utc).isoformat()}\n\n"
        finally:
            await sse.unsubscribe(q)

    return StreamingResponse(gen(), media_type="text/event-stream")
