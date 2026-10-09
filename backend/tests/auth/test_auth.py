"""Auth tests: register, login, duplicate, RBAC."""

from tests.conftest import auth_headers


def test_register_and_login(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "new1@novamart.vn", "password": "secret123", "name": "New User",
    })
    assert r.status_code == 201
    assert "access_token" in r.json()["tokens"]

    r = client.post("/api/v1/auth/login", json={
        "email": "new1@novamart.vn", "password": "secret123",
    })
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "new1@novamart.vn"


def test_register_duplicate_email(client, customer_token):
    email = customer_token[0]["email"]
    r = client.post("/api/v1/auth/register", json={
        "email": email, "password": "secret123", "name": "Dup",
    })
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "conflict"


def test_login_wrong_password(client, customer_token):
    r = client.post("/api/v1/auth/login", json={
        "email": customer_token[0]["email"], "password": "wrong",
    })
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_with_token(client, customer_token):
    _, token = customer_token
    r = client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["email"] == customer_token[0]["email"]


def test_refresh_token(client, customer_token):
    r = client.post("/api/v1/auth/login", json={
        "email": customer_token[0]["email"], "password": "123456",
    })
    refresh = r.json()["tokens"]["refresh_token"]
    r = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_customer_cannot_access_admin(client, customer_token):
    _, token = customer_token
    r = client.get("/api/v1/dashboard/summary", headers=auth_headers(token))
    assert r.status_code == 403


def test_admin_can_access_admin(client, admin_token):
    _, token = admin_token
    r = client.get("/api/v1/dashboard/summary", headers=auth_headers(token))
    assert r.status_code == 200
