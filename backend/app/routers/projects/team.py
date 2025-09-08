from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ... import models, schemas
from .deps import get_db
from .helpers import require_project, now_utc
from .sse import notify

router = APIRouter()

@router.get("/{project_id}/team", response_model=List[schemas.TeamMemberOut])
def list_team(project_id: int, db: Session = Depends(get_db)):
    require_project(db, project_id, allow_deleted=True)
    members = (
        db.query(models.TeamMember)
        .filter(models.TeamMember.project_id == project_id)
        .order_by(models.TeamMember.id.asc())
        .all()
    )
    return [
        schemas.TeamMemberOut(
            id=m.id, project_id=m.project_id, name=m.name, role=m.role, capacity=m.capacity
        )
        for m in members
    ]

@router.post("/{project_id}/team", response_model=schemas.TeamMemberOut, status_code=201)
def add_team_member(project_id: int, body: schemas.TeamMemberCreate, db: Session = Depends(get_db)):
    require_project(db, project_id)
    m = models.TeamMember(project_id=project_id, name=body.name, role=body.role, capacity=body.capacity)
    db.add(m); db.flush()
    now = now_utc()
    db.add(models.Event(project_id=project_id, kind="team", message=f"Added {body.name} ({body.role})", at=now))
    db.commit(); db.refresh(m)

    ev = (
        db.query(models.Event)
        .filter(models.Event.project_id == project_id, models.Event.at == now)
        .order_by(models.Event.id.desc())
        .first()
    )
    if ev:
        notify({"type": "event_created","project_id": project_id,"event": {"id": ev.id, "kind": ev.kind, "message": ev.message, "at": ev.at.isoformat()},})
    return schemas.TeamMemberOut(id=m.id, project_id=m.project_id, name=m.name, role=m.role, capacity=m.capacity)

@router.put("/{project_id}/team/{member_id}", response_model=schemas.TeamMemberOut)
def update_team_member(project_id: int, member_id: int, body: schemas.TeamMemberUpdate, db: Session = Depends(get_db)):
    require_project(db, project_id)
    m = db.get(models.TeamMember, member_id)
    if not m or m.project_id != project_id:
        raise HTTPException(status_code=404, detail="Team member not found")
    before = (m.name, m.role, m.capacity)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit(); db.refresh(m)
    after = (m.name, m.role, m.capacity)
    if before != after:
        now = now_utc()
        db.add(models.Event(project_id=project_id, kind="team", message=f"Updated member {m.name}", at=now))
        db.commit()
        ev = (
            db.query(models.Event)
            .filter(models.Event.project_id == project_id, models.Event.at == now)
            .order_by(models.Event.id.desc())
            .first()
        )
        if ev:
            notify({"type": "event_created","project_id": project_id,"event": {"id": ev.id, "kind": ev.kind, "message": ev.message, "at": ev.at.isoformat()},})
    return schemas.TeamMemberOut(id=m.id, project_id=m.project_id, name=m.name, role=m.role, capacity=m.capacity)

@router.delete("/{project_id}/team/{member_id}", status_code=204)
def delete_team_member(project_id: int, member_id: int, db: Session = Depends(get_db)):
    require_project(db, project_id)
    m = db.get(models.TeamMember, member_id)
    if not m or m.project_id != project_id:
        raise HTTPException(status_code=404, detail="Team member not found")
    name = m.name
    db.delete(m)
    now = now_utc()
    db.add(models.Event(project_id=project_id, kind="team", message=f"Removed member {name}", at=now))
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
