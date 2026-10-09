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
    try:
        from alembic import command
        from alembic.config import Config
        import os
        alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
        command.upgrade(alembic_cfg, "head")
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
