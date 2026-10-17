"""Router cho module projects. Prefix: /api/projects"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.base import get_db

from . import service
from .schemas import DuplicateRequest, ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])

NOT_FOUND = "Không tìm thấy dự án"


@router.get("/", response_model=list[ProjectOut])
def list_projects_ep(db: Session = Depends(get_db)):
    return [service.project_out_dict(db, p) for p in service.list_projects(db)]


@router.post("/", response_model=ProjectOut, status_code=201)
def create_project_ep(data: ProjectCreate, db: Session = Depends(get_db)):
    project = service.create_project(db, data)
    return service.project_out_dict(db, project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project_ep(project_id: int, db: Session = Depends(get_db)):
    project = service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return service.project_out_dict(db, project)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project_ep(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = service.update_project(db, project_id, data)
    if not project:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return service.project_out_dict(db, project)


@router.delete("/{project_id}", status_code=204)
def delete_project_ep(project_id: int, db: Session = Depends(get_db)):
    if not service.delete_project(db, project_id):
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return None


@router.post("/{project_id}/duplicate", response_model=ProjectOut, status_code=201)
def duplicate_project_ep(project_id: int, data: DuplicateRequest, db: Session = Depends(get_db)):
    project = service.duplicate_project(db, project_id, data.new_name)
    if not project:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return service.project_out_dict(db, project)
