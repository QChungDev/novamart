"""Dashboard endpoints (admin only)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import require_admin
from app.modules.dashboard.schemas import DashboardSummary
from app.modules.dashboard.service import DashboardService
from app.modules.users.entities import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    days: int = Query(14, ge=7, le=90),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return DashboardService(db).summary(days=days)
