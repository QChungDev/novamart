"""SQLAlchemy engine/session/Base dung chung."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _engine_kwargs() -> dict:
    if settings.is_sqlite:
        return {"connect_args": {"check_same_thread": False}}
    # Supabase pooler (PgBouncer, transaction mode) KHONG ho tro prepared statement
    # phia server cua psycopg3 -> tat han de tranh loi DuplicatePreparedStatement
    # khi khoi dong (init_db) cung nhu trong qua trinh chay.
    return {
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
        "connect_args": {"prepare_threshold": None},
    }


engine = create_engine(settings.DATABASE_URL, **_engine_kwargs())
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # import models de dang ky metadata
    import app.database.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
