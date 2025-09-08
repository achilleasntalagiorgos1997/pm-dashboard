from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session, Query as SAQuery
from ... import models, schemas
from .deps import DEFAULT_SORT_BY, DEFAULT_SORT_DIR

def tags_to_str(tags: Optional[List[str]]) -> str:
    if not tags:
        return ""
    cleaned = [t.strip() for t in tags if t and t.strip()]
    return ",".join(sorted(set(cleaned)))

def str_to_tags(s: Optional[str]) -> List[str]:
    if not s:
        return []
    return [t for t in s.split(",") if t]

def project_to_out(p: models.Project) -> schemas.ProjectOut:
    recent = sorted(p.events, key=lambda e: (e.at, e.id), reverse=True)[:10]
    return schemas.ProjectOut(
        id=p.id,
        title=p.title,
        description=p.description,
        owner=p.owner,
        status=p.status,
        health=p.health,
        tags=str_to_tags(p.tags),
        progress=p.progress,
        last_updated=p.last_updated,
        version=p.version,
        deleted_at=p.deleted_at,
        team=[
            schemas.TeamMemberOut(
                id=m.id, project_id=p.id, name=m.name, role=m.role, capacity=m.capacity
            )
            for m in p.team
        ],
        recent_events=[
            schemas.EventOut(
                id=e.id, project_id=p.id, kind=e.kind, message=e.message, at=e.at
            )
            for e in recent
        ],
    )

def require_project(db: Session, project_id: int, *, allow_deleted: bool = False) -> models.Project:
    p = db.get(models.Project, project_id)
    if not p or (not allow_deleted and p.deleted_at is not None):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Project not found")
    return p

def build_projects_query(
    db: Session,
    *,
    q: Optional[str] = None,
    status: Optional[str] = None,
    owner: Optional[str] = None,
    tag: Optional[str] = None,
    health: Optional[str] = None,
    include_deleted: bool = False,
) -> SAQuery:
    query = db.query(models.Project)
    if not include_deleted:
        query = query.filter(models.Project.deleted_at.is_(None))
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            or_(
                func.lower(models.Project.title).like(like),
                func.lower(models.Project.description).like(like),
                func.lower(models.Project.tags).like(like),
                func.lower(models.Project.owner).like(like),
            )
        )
    if status:
        query = query.filter(models.Project.status == status)
    if owner:
        query = query.filter(models.Project.owner == owner)
    if tag:
        query = query.filter(models.Project.tags.like(f"%{tag}%"))
    if health:
        query = query.filter(models.Project.health == health)
    return query

def apply_sorting(query: SAQuery, *, sort_by: str = DEFAULT_SORT_BY, sort_dir: str = DEFAULT_SORT_DIR) -> SAQuery:
    sort_col = getattr(models.Project, sort_by, models.Project.last_updated)
    return query.order_by(desc(sort_col) if sort_dir.lower() == "desc" else asc(sort_col))

def paginate(query: SAQuery, *, page: int, page_size: int) -> Tuple[int, List[models.Project]]:
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return total, items

def now_utc():
    return datetime.now(timezone.utc)
