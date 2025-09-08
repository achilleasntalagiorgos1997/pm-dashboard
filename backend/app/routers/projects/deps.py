from typing import Iterable
from sqlalchemy.orm import Session
from ...database import SessionLocal

# shared constants
DEFAULT_SORT_BY = "last_updated"
DEFAULT_SORT_DIR = "desc"
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 10

def get_db() -> Iterable[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
