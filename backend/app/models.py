from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, default="")
    owner = Column(String(120), index=True)
    status = Column(String(50), index=True, default="active")
    health = Column(String(20), index=True, default="green")
    tags = Column(String(255), default="")
    progress = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    version = Column(Integer, default=1)
    deleted_at = Column(DateTime, nullable=True)

    team = relationship("TeamMember", back_populates="project", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")  # ✅

class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name = Column(String(120), nullable=False)
    role = Column(String(120), nullable=False)
    capacity = Column(Float, default=1.0)
    project = relationship("Project", back_populates="team")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    kind = Column(String(50), default="update")
    message = Column(Text, default="")
    at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    project = relationship("Project", back_populates="events")

class Milestone(Base):  
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    title = Column(String(200), nullable=False)
    done = Column(Boolean, default=False)
    due_at = Column(DateTime, nullable=True)
    sort = Column(Integer, default=0)
    project = relationship("Project", back_populates="milestones")
