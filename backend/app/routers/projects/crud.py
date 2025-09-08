from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy.orm import Session
from ... import models, schemas
from .deps import get_db, DEFAULT_SORT_BY, DEFAULT_SORT_DIR, DEFAULT_PAGE, DEFAULT_PAGE_SIZE
from .helpers import (
    build_projects_query, apply_sorting, paginate, project_to_out,
    require_project, tags_to_str, str_to_tags, now_utc
)
from .sse import notify

try:
    from ...events import publish  # optional
except Exception:  # pragma: no cover
    publish = None  # type: ignore

router = APIRouter()

@router.get("/", response_model=schemas.PaginatedProjects)
def list_projects(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    status: Optional[str] = None,
    owner: Optional[str] = None,
    tag: Optional[str] = None,
    health: Optional[str] = None,
    include_deleted: bool = False,
    sort_by: str = DEFAULT_SORT_BY,
    sort_dir: str = DEFAULT_SORT_DIR,
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
):
    query = build_projects_query(
        db, q=q, status=status, owner=owner, tag=tag,
        health=health, include_deleted=include_deleted
    )
    query = apply_sorting(query, sort_by=sort_by, sort_dir=sort_dir)
    total, items = paginate(query, page=page, page_size=page_size)
    return schemas.PaginatedProjects(
        items=[project_to_out(p) for p in items],
        total=total, page=page, page_size=page_size
    )

@router.post("/", response_model=schemas.ProjectOut, status_code=201)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    now = now_utc()
    p = models.Project(
        title=payload.title,
        description=payload.description,
        owner=payload.owner,
        status=payload.status,
        health=payload.health,
        tags=tags_to_str(payload.tags),
        progress=payload.progress,
        last_updated=now,
    )
    db.add(p); db.flush()
    for m in getattr(payload, "team", []) or []:
        db.add(models.TeamMember(project_id=p.id, name=m.name, role=m.role, capacity=m.capacity))
    db.add(models.Event(project_id=p.id, kind="created", message=f"Project '{p.title}' created", at=now))
    db.commit(); db.refresh(p)

    if publish:
        try: publish("project.created", {"id": p.id})
        except Exception: pass

    notify({"type": "project_created", "id": p.id})
    return project_to_out(p)

@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    return project_to_out(require_project(db, project_id))

@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    response: Response,
    if_match: Optional[str] = Header(None, convert_underscores=False),
    db: Session = Depends(get_db),
):
    p = require_project(db, project_id)

    # ETag (version) optimistic concurrency
    if if_match:
        try:
            expected = int(if_match.strip('"'))
        except ValueError:
            expected = None
        if expected is not None and expected != p.version:
            raise HTTPException(status_code=412, detail="Version mismatch (optimistic concurrency)")

    changed: List[str] = []
    data = payload.model_dump(exclude_unset=True)

    if "tags" in data:
        new_tags = tags_to_str(data["tags"])
        if new_tags != p.tags:
            p.tags = new_tags; changed.append("tags")
        del data["tags"]

    for field, val in data.items():
        if hasattr(p, field) and getattr(p, field) != val:
            setattr(p, field, val); changed.append(field)

    if changed:
        p.version += 1
        p.last_updated = now_utc()
        db.add(models.Event(project_id=p.id, kind="updated", message=f"Updated: {', '.join(changed)}", at=p.last_updated))
        db.commit(); db.refresh(p)
        response.headers["ETag"] = f'"{p.version}"'
        if publish:
            try: publish("project.updated", {"id": p.id, "changed": changed})
            except Exception: pass
        # SSE patch
        patch = {k: getattr(p, k) for k in changed if hasattr(p, k)}
        if "tags" in changed: patch["tags"] = str_to_tags(p.tags)
        notify({"type": "project_updated", "id": p.id, "changed": changed, "patch": patch})

    return project_to_out(p)

@router.delete("/{project_id}", status_code=204)
def soft_delete(project_id: int, db: Session = Depends(get_db)):
    p = require_project(db, project_id)
    p.deleted_at = now_utc(); p.version += 1
    db.add(models.Event(project_id=p.id, kind="deleted", message="Soft deleted", at=p.deleted_at))
    db.commit()
    if publish:
        try: publish("project.deleted", {"id": p.id})
        except Exception: pass
    notify({"type": "project_deleted", "id": p.id})
    return

@router.post("/{project_id}/recover", response_model=schemas.ProjectOut)
def recover(project_id: int, db: Session = Depends(get_db)):
    p = require_project(db, project_id, allow_deleted=True)
    if p.deleted_at is None:
        raise HTTPException(status_code=404, detail="Project not recoverable")
    p.deleted_at = None; p.version += 1; p.last_updated = now_utc()
    db.add(models.Event(project_id=p.id, kind="recovered", message="Recovered from soft delete", at=p.last_updated))
    db.commit(); db.refresh(p)
    if publish:
        try: publish("project.recovered", {"id": p.id})
        except Exception: pass
    notify({"type": "project_recovered", "id": p.id})
    return project_to_out(p)
