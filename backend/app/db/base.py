"""Shared SQLAlchemy declarative base. All models must inherit from Base."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
