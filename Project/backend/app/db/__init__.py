from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.config import get_config


config = get_config()

# Create the SQLAlchemy engine and session factory
engine = create_engine(config.SQLALCHEMY_DATABASE_URI, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()


def init_db() -> None:
    """Create database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Yield a new database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


__all__ = ["Base", "engine", "SessionLocal", "get_db", "init_db"]