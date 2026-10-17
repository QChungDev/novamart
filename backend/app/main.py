"""AI Shorts Studio - FastAPI backend."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.worker import start_worker, stop_worker
from app.database.base import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_worker()
    yield
    stop_worker()


app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Media static: /media/...
app.mount("/media", StaticFiles(directory=str(settings.media_root_path)), name="media")


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


from app.modules.projects.router import router as projects_router
from app.modules.characters.router import router as characters_router
from app.modules.scripts.router import router as scripts_router
from app.modules.video_generation.router import router as video_router
from app.modules.voices.router import router as voices_router
from app.modules.media.router import router as media_router
from app.modules.rendering.router import router as rendering_router

app.include_router(projects_router)
app.include_router(characters_router)
app.include_router(scripts_router)
app.include_router(video_router)
app.include_router(voices_router)
app.include_router(media_router)
app.include_router(rendering_router)
