"""Pytest configuration: isolated test database."""

import os

os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = "mysql+pymysql://novamart:novamart_secret@127.0.0.1:3306/novamart_test?charset=utf8mb4"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Import settings AFTER env vars are set.
from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

import app.db.models  # noqa: F401,E402  (register entities)
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402

TEST_DB_URL = os.environ["DATABASE_URL"]

engine = create_engine(TEST_DB_URL)
TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create test database schema once per session."""
    with engine.connect() as conn:
        conn.execute(text("CREATE DATABASE IF NOT EXISTS novamart_test CHARACTER SET utf8mb4"))
        conn.commit()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # Keep tables for inspection; drop on next run.


@pytest.fixture()
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def customer_token(client):
    """Register a fresh customer and return (user, token)."""
    import uuid
    email = f"test_{uuid.uuid4().hex[:8]}@novamart.vn"
    r = client.post("/api/v1/auth/register", json={
        "email": email, "password": "123456", "name": "Test Customer",
    })
    assert r.status_code == 201, r.text
    data = r.json()
    return data["user"], data["tokens"]["access_token"]


@pytest.fixture()
def admin_token(client, db):
    """Create an admin user directly and return (user, token)."""
    import uuid
    from app.core.security import hash_password
    from app.modules.users.entities import User

    email = f"admin_{uuid.uuid4().hex[:8]}@novamart.vn"
    user = User(email=email, password_hash=hash_password("admin123"),
                name="Admin", role="admin", is_active=True)
    db.add(user)
    db.commit()
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["user"], r.json()["tokens"]["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
