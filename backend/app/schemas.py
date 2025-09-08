from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# =========================
# Team
# =========================
class TeamMemberBase(BaseModel):
    name: str
    role: str
    capacity: float = Field(ge=0.0, le=1.0)


class TeamMemberCreate(TeamMemberBase):
    pass


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    capacity: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class TeamMemberOut(TeamMemberBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True


# =========================
# Milestones
# =========================
class MilestoneBase(BaseModel):
    title: str
    done: bool = False
    due_at: Optional[datetime] = None
    sort: int = 0


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    done: Optional[bool] = None
    due_at: Optional[datetime] = None
    sort: Optional[int] = None


class MilestoneOut(MilestoneBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True


# =========================
# Events
# =========================
class EventCreate(BaseModel):
    kind: str = "comment"
    message: str


class EventOut(BaseModel):
    id: int
    project_id: int
    kind: str
    message: str
    at: datetime

    class Config:
        from_attributes = True


# =========================
# Projects
# =========================
class ProjectBase(BaseModel):
    title: str
    description: str = ""
    owner: str
    status: str = "active"
    health: str = "green"
    tags: List[str] = []


class ProjectCreate(ProjectBase):
    progress: float = 0.0
    # optional: allow creating with initial team
    team: List[TeamMemberCreate] = []


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    health: Optional[str] = None
    tags: Optional[List[str]] = None
    progress: Optional[float] = None


class ProjectOut(ProjectBase):
    id: int
    progress: float
    last_updated: datetime
    version: int
    deleted_at: Optional[datetime] = None

    # embedded extras for detail/list views
    team: List[TeamMemberOut] = []
    recent_events: List[EventOut] = []

    class Config:
        from_attributes = True


# =========================
# List wrapper
# =========================
class PaginatedProjects(BaseModel):
    items: List[ProjectOut]
    total: int
    page: int
    page_size: int


# =========================
# Bulk update
# =========================
class BulkUpdateRequest(BaseModel):
    ids: List[int]
    set_status: Optional[str] = None
    add_tag: Optional[str] = None
    remove_tag: Optional[str] = None
