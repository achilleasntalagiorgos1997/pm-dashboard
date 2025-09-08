from typing import List, Callable
from asyncio import Queue

subscribers: List[Queue] = []

async def publish(event: dict):
    dead = []
    for q in subscribers:
        try:
            await q.put(event)
        except Exception:
            dead.append(q)
    for d in dead:
        subscribers.remove(d)

async def subscribe() -> Queue:
    q: Queue = Queue()
    subscribers.append(q)
    return q

def unsubscribe(q: Queue):
    try:
        subscribers.remove(q)
    except ValueError:
        pass
