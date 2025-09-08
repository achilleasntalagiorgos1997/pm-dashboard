from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ... import models, schemas
from .deps import get_db
from .helpers import require_project

router = APIRouter()

@router.get("/{project_id}/events", response_model=List[schemas.EventOut])
def list_events(project_id: int, limit: int = Query(20, ge=1, le=200), db: Session = Depends(get_db)):
    require_project(db, project_id, allow_deleted=True)
    q = (
        db.query(models.Event)
        .filter(models.Event.project_id == project_id)
        .order_by(models.Event.at.desc(), models.Event.id.desc())
        .limit(limit)
    )
    events = q.all()
    return [schemas.EventOut(id=e.id, project_id=e.project_id, kind=e.kind, message=e.message, at=e.at) for e in events]

@router.post("/{project_id}/events", response_model=schemas.EventOut, status_code=201)
def add_event(project_id: int, body: schemas.EventCreate, db: Session = Depends(get_db)):
    p = require_project(db, project_id)
    from .helpers import now_utc
    now = now_utc()
    ev = models.Event(project_id=project_id, kind=body.kind, message=body.message, at=now)
    db.add(ev)
    p.last_updated = now  # touch project
    db.commit(); db.refresh(ev)
    from .sse import notify
    notify({"type": "event_created","project_id": project_id,"event": {"id": ev.id, "kind": ev.kind, "message": ev.message, "at": ev.at.isoformat()},})
    return schemas.EventOut(id=ev.id, project_id=ev.project_id, kind=ev.kind, message=ev.message, at=ev.at)
