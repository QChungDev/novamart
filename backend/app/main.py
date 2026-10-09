"""NovaMart FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger
import app.db.models  # noqa: F401  (register all entities for relationships)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} (env={settings.APP_ENV})")
    # Auto-run migrations on startup (for Railway deployment)
    # NOTE: backend/alembic/ (local migrations folder) shadows the pip 'alembic'
    # package, so temporarily drop backend_dir from sys.path to import the real one.
    try:
        import sys as _sys
        import os as _os
        _backend_dir = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), ".."))
        _orig_path = _sys.path[:]
        _sys.path = [p for p in _sys.path if _os.path.abspath(p or ".") != _backend_dir]
        try:
            from alembic import command as _alembic_command
            from alembic.config import Config as _AlembicConfig
        finally:
            _sys.path = _orig_path
        _alembic_cfg = _AlembicConfig(_os.path.join(_backend_dir, "alembic.ini"))
        _alembic_command.upgrade(_alembic_cfg, "head")
        logger.info("Database migrations applied successfully")
    except Exception as e:
        logger.warning(f"Migration failed (may already be applied): {e}")
    # Auto-seed sample data if database is empty
    try:
        from app.db.session import SessionLocal
        from app.db import models
        db = SessionLocal()
        try:
            if db.query(models.Product).count() == 0:
                logger.info("Database empty, running seed...")
                from app.db.seed import seed
                seed(db)
                logger.info("Seed completed")
            db.close()
        except Exception:
            db.close()
            raise
    except Exception as e:
        logger.warning(f"Seed check failed: {e}")
    # Auto-create admin from env vars (ADMIN_EMAIL/ADMIN_PASSWORD) if not exists
    try:
        import os as _os2
        _admin_email = _os2.getenv("ADMIN_EMAIL", "").strip().lower()
        _admin_password = _os2.getenv("ADMIN_PASSWORD", "")
        if _admin_email and _admin_password:
            from app.db.session import SessionLocal as _SessionLocal2
            from app.db import models as _models2
            from app.core.security import hash_password as _hash_pw
            _db2 = _SessionLocal2()
            try:
                _existing = _db2.query(_models2.User).filter_by(email=_admin_email).first()
                if _existing:
                    if _existing.role != "admin":
                        _existing.role = "admin"
                        _db2.commit()
                        logger.info(f"Promoted {_admin_email} to admin")
                else:
                    _admin = _models2.User(
                        email=_admin_email,
                        password_hash=_hash_pw(_admin_password),
                        full_name="Administrator",
                        role="admin",
                        is_active=True,
                    )
                    _db2.add(_admin)
                    _db2.commit()
                    logger.info(f"Admin account {_admin_email} created")
                _db2.close()
            except Exception:
                _db2.close()
                raise
    except Exception as e:
        logger.warning(f"Admin bootstrap failed: {e}")
    yield
    logger.info("Shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="NovaMart e-commerce API — Phase 2 backend (FastAPI + MySQL).",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok", "env": settings.APP_ENV}

    return app


app = create_app()
