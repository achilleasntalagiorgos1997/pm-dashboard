from typing import Dict, List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ... import models
from .deps import get_db
from .helpers import str_to_tags, tags_to_str, now_utc
from .sse import notify

try:
    from ...events import publish  # optional
except Exception:  # pragma: no cover
    publish = None  # type: ignore

router = APIRouter()

BulkAction = Literal["update_status", "add_tag", "remove_tag"]

class BulkRequest(BaseModel):
    action: BulkAction
    ids: List[int]
    versions: Dict[int, int]
    new_status: Optional[str] = None
    tag: Optional[str] = None

class BulkConflict(BaseModel):
    id: int
    expected: int
    found: int

class BulkResponse(BaseModel):
    updated_count: int
    conflicts: Optional[List[BulkConflict]] = None

@router.post("/bulk", response_model=BulkResponse)
def bulk_update(payload: BulkRequest, db: Session = Depends(get_db)):
    projects = (
        db.query(models.Project)
        .filter(models.Project.id.in_(payload.ids))
        .with_for_update()
        .all()
    )
    if not projects:
        return BulkResponse(updated_count=0, conflicts=[
            BulkConflict(id=i, expected=payload.versions.get(i, -1), found=-1)
            for i in payload.ids
        ])

    current_versions = {p.id: p.version for p in projects}
    conflicts: List[BulkConflict] = []
    for pid in payload.ids:
        exp = payload.versions.get(pid)
        found = current_versions.get(pid)
        if exp is None or found is None or exp != found:
            conflicts.append(BulkConflict(id=pid, expected=exp or -1, found=found or -1))
    if conflicts:
        return BulkResponse(updated_count=0, conflicts=conflicts)

    if payload.action == "update_status":
        if not payload.new_status:
            raise HTTPException(status_code=400, detail="new_status is required")
    elif payload.action in ("add_tag", "remove_tag"):
        if not payload.tag:
            raise HTTPException(status_code=400, detail="tag is required")
    else:
        raise HTTPException(status_code=400, detail="Unsupported action")

    now = now_utc()
    changed_ids: List[int] = []
    changed_fields_by_id: Dict[int, List[str]] = {}

    try:
        for p in projects:
            changed: List[str] = []
            if payload.action == "update_status":
                if p.status != payload.new_status:
                    p.status = payload.new_status  # type: ignore
                    changed.append("status")
            elif payload.action == "add_tag":
                cur = set(str_to_tags(p.tags))
                if payload.tag not in cur:      # type: ignore
                    cur.add(payload.tag)        # type: ignore
                    p.tags = tags_to_str(list(cur)); changed.append("tags")
            elif payload.action == "remove_tag":
                cur = set(str_to_tags(p.tags))
                if payload.tag in cur:          # type: ignore
                    cur.remove(payload.tag)     # type: ignore
                    p.tags = tags_to_str(list(cur)); changed.append("tags")
            if changed:
                p.version += 1
                p.last_updated = now
                db.add(models.Event(
                    project_id=p.id, kind="bulk",
                    message=f"Bulk updated: {', '.join(changed)}", at=now
                ))
                changed_ids.append(p.id)
                changed_fields_by_id[p.id] = changed
        db.commit()
    except Exception:
        db.rollback()
        raise

    if publish and changed_ids:
        try: publish("project.bulk_updated", {"ids": changed_ids})
        except Exception: pass

    for pid in changed_ids:
        patch_fields = changed_fields_by_id.get(pid, [])
        from sqlalchemy.orm import Session  # for type hints
        _ = db  # keep handle
        # emit minimal patch
        from .helpers import str_to_tags  # local import for clarity
        p = db.get(models.Project, pid)
        if not p: 
            continue
        patch = {k: getattr(p, k) for k in patch_fields if hasattr(p, k)}
        if "tags" in patch_fields:
            patch["tags"] = str_to_tags(p.tags)
        notify({"type": "project_updated", "id": pid, "changed": patch_fields, "patch": patch})

    return BulkResponse(updated_count=len(changed_ids))
