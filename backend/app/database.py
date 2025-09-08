from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Define the database URL (using SQLite in this case)
SQLALCHEMY_DATABASE_URL = "sqlite:///./projects.db"

# Create the SQLAlchemy engine with SQLite-specific connection arguments
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a base class for declarative class definitions
Base = declarative_base()

# Import models to ensure tables are registered with SQLAlchemy's metadata
from . import models

# Automatically create database tables based on the models (for development/demo purposes)
from app.database import Base, engine
from app import models

Base.metadata.create_all(bind=engine)
print("Tables created!")