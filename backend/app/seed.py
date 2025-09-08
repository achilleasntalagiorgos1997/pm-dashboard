from __future__ import annotations

from datetime import datetime, timedelta, timezone
import random

from .database import SessionLocal
from . import models

# ---------- Demo data ----------
PROJECT_TITLES = [
    "Project Alpha", "Project Beta", "Project Gamma",
    "Project Delta", "Project Epsilon"
]

OWNERS = ["Alice", "Bob", "Charlie", "Diana", "Eve"]
STATUSES = ["active", "planning", "completed", "inactive"]
HEALTHS = ["green", "yellow", "red"]
TAGS = ["frontend", "backend", "demo", "urgent", "research"]
ROLES = ["PM", "Dev", "QA", "Designer"]


# ---------- Helpers ----------
def pick_tags_str(k: int = 2) -> str:
    # DB field expects a comma-separated string
    return ",".join(sorted(random.sample(TAGS, k=k)))


def make_team_members(project_id: int) -> list[models.TeamMember]:
    members: list[models.TeamMember] = []
    # always at least a PM + 1 dev
    base = [
        ("Owner/PM", "PM", 1.0),
        ("Dev A", "Dev", round(random.uniform(0.6, 1.0), 1)),
    ]
    # optionally add 1-2 more from pool
    extra_cnt = random.randint(0, 2)
    for _ in range(extra_cnt):
        name = random.choice(OWNERS)
        role = random.choice(ROLES)
        cap = round(random.uniform(0.5, 1.0), 1)
        base.append((name, role, cap))

    for name, role, cap in base:
        members.append(
            models.TeamMember(project_id=project_id, name=name, role=role, capacity=cap)
        )
    return members


def make_events(project_id: int) -> list[models.Event]:
    now = datetime.now(timezone.utc)
    kinds = ["created", "updated", "comment", "progress"]
    events: list[models.Event] = [
        models.Event(
            project_id=project_id,
            kind="created",
            message="Project created",
            at=now - timedelta(days=random.randint(5, 15)),
        )
    ]
    # 2–4 additional events
    for _ in range(random.randint(2, 4)):
        k = random.choice(kinds[1:])
        msg = {
            "updated": "Fields updated",
            "comment": "Discussion note added",
            "progress": f"Progress changed to {random.randint(10,90)}%",
        }[k]
        events.append(
            models.Event(
                project_id=project_id,
                kind=k,
                message=msg,
                at=now - timedelta(days=random.randint(0, 10)),
            )
        )
    # ensure chronological order is plausible
    events.sort(key=lambda e: e.at)
    return events


def make_milestones(project_id: int) -> list[models.Milestone]:
    """
    Create 3–4 milestones; 1–2 done to give a derived % > 0 sometimes.
    """
    titles = ["Kickoff", "Design", "MVP", "Beta", "Launch"]
    random.shuffle(titles)
    count = random.randint(3, 4)
    chosen = titles[:count]
    ms: list[models.Milestone] = []
    base_due = datetime.now(timezone.utc) + timedelta(days=7)
    for i, t in enumerate(chosen, start=1):
        done = i <= random.randint(1, 2)  # mark first 1–2 as done
        due = base_due + timedelta(days=7 * (i - 1))
        ms.append(
            models.Milestone(
                project_id=project_id,
                title=t,
                done=done,
                due_at=due,
                sort=i,
            )
        )
    return ms


# ---------- Seed ----------
def main():
    created = 0
    with SessionLocal() as db:
        for title in PROJECT_TITLES:
            p = models.Project(
                title=title,
                description=f"This is {title}",
                owner=random.choice(OWNERS),
                status=random.choice(STATUSES),
                health=random.choice(HEALTHS),
                tags=pick_tags_str(),
                progress=random.randint(0, 100),  # independent from milestones for now
                last_updated=datetime.now(timezone.utc),
            )
            db.add(p)
            db.flush()  # get p.id

            # team
            db.add_all(make_team_members(p.id))
            # milestones
            if hasattr(models, "Milestone"):
                db.add_all(make_milestones(p.id))
            # activity events
            db.add_all(make_events(p.id))

            created += 1

        db.commit()

    print(f"Seeded {created} demo projects with team, milestones, and events successfully!")


if __name__ == "__main__":
    main()
