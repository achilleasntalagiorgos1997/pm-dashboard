from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ... import models, schemas
from .deps import get_db
from .helpers import require_project, now_utc
from .sse import notify

router = APIRouter()

@router.get("/{project_id}/milestones", response_model=List[schemas.MilestoneOut])
def list_milestones(project_id: int, db: Session = Depends(get_db)):
    require_project(db, project_id, allow_deleted=True)
    ms = (
        db.query(models.Milestone)
        .filter(models.Milestone.project_id == project_id)
        .order_by(models.Milestone.sort.asc(), models.Milestone.id.asc())
        .all()
    )
    return [
        schemas.MilestoneOut(
            id=m.id, project_id=m.project_id, title=m.title, done=m.done, due_at=m.due_at, sort=m.sort
        )
        for m in ms
    ]

@router.post("/{project_id}/milestones", response_model=schemas.MilestoneOut, status_code=201)
def add_milestone(project_id: int, body: schemas.MilestoneCreate, db: Session = Depends(get_db)):
    require_project(db, project_id)
    m = models.Milestone(project_id=project_id, title=body.title, done=body.done, due_at=body.due_at, sort=body.sort)
    db.add(m); db.flush()
    now = now_utc()
    db.add(models.Event(project_id=project_id, kind="milestone", message=f"Added milestone '{m.title}'", at=now))
    db.commit(); db.refresh(m)
    ev = (
        db.query(models.Event)
        .filter(models.Event.project_id == project_id, models.Event.at == now)
        .order_by(models.Event.id.desc())
        .first()
    )
    if ev:
        notify({"type": "event_created","project_id": project_id,"event": {"id": ev.id, "kind": ev.kind, "message": ev.message, "at": ev.at.isoformat()},})
    return schemas.MilestoneOut(id=m.id, project_id=m.project_id, title=m.title, done=m.done, due_at=m.due_at, sort=m.sort)

@router.put("/{project_id}/milestones/{milestone_id}", response_model=schemas.MilestoneOut)
def update_milestone(project_id: int, milestone_id: int, body: schemas.MilestoneUpdate, db: Session = Depends(get_db)):
    require_project(db, project_id)
    m = db.get(models.Milestone, milestone_id)
    if not m or m.project_id != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    before = (m.title, m.done, m.due_at, m.sort)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit(); db.refresh(m)
    after = (m.title, m.done, m.due_at, m.sort)
    if before != after:
        now = now_utc()
        db.add(models.Event(project_id=project_id, kind="milestone", message=f"Updated milestone '{m.title}'", at=now))
        db.commit()
        ev = (
            db.query(models.Event)
            .filter(models.Event.project_id == project_id, models.Event.at == now)
            .order_by(models.Event.id.desc())
            .first()
        )
        if ev:
            notify({"type": "event_created","project_id": project_id,"event": {"id": ev.id, "kind": ev.kind, "message": ev.message, "at": ev.at.isoformat()},})
    return schemas.MilestoneOut(id=m.id, project_id=m.project_id, title=m.title, done=m.done, due_at=m.due_at, sort=m.sort)

@router.delete("/{project_id}/milestones/{milestone_id}", status_code=204)
def delete_milestone(project_id: int, milestone_id: int, db: Session = Depends(get_db)):
    require_project(db, project_id)
    m = db.get(models.Milestone, milestone_id)
    if not m or m.project_id != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    title = m.title
    db.delete(m)
    now = now_utc()
    db.add(models.Event(project_id=project_id, kind="milestone", message=f"Removed milestone '{title}'", at=now))
    db.commit()
    ev = (
        db.query(models.Event)
        .filter(models.Event.project_id == project_id, models.Event.at == now)
        .order_by(models.Event.id.desc())
        .first()
    )
    if ev:
        notify({"type": "event_created","project_id": project_id,"event": {"id": ev.id, "kind": ev.kind, "message": ev.message, "at": ev.at.isoformat()},})
    return
