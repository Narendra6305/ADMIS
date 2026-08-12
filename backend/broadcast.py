import json
import asyncio
from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
from auth import get_current_user
from models import User

subscribers: list[asyncio.Queue] = []

router = APIRouter()

@router.get("/events/stream")
async def stream(user: User = Depends(get_current_user)):
    q = asyncio.Queue()
    subscribers.append(q)
    async def event_gen():
        try:
            while True:
                event = await q.get()
                yield {
                    "event": event["type"],
                    "data": json.dumps(event["payload"])
                }
        except asyncio.CancelledError:
            pass
        finally:
            if q in subscribers:
                subscribers.remove(q)
    return EventSourceResponse(event_gen())

async def broadcast(event_type: str, payload: dict):
    for q in list(subscribers):
        try:
            await q.put({"type": event_type, "payload": payload})
        except Exception as e:
            print(f"[broadcast] Failed to notify queue subscriber: {e}")
