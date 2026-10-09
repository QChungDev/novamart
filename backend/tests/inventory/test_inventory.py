"""Inventory + coupon + dashboard tests."""

import uuid
from datetime import datetime, timedelta, timezone

from tests.conftest import auth_headers


def _make_product(client, admin_token, stock=5):
    uid = uuid.uuid4().hex[:8]
    _, token = admin_token
    r = client.post("/api/v1/products", json={
        "name": f"InvProd {uid}", "slug": f"invprod-{uid}",
        "sku": f"INV-{uid.upper()}", "price": 100000, "stock": stock,
    }, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json(), token


def test_stock_receive_and_adjust(client, admin_token):
    p, token = _make_product(client, admin_token, stock=5)
    r = client.post("/api/v1/inventory/receive",
                    json={"product_id": p["id"], "quantity": 10, "reason": "Nhập kho test"},
                    headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["stock"] == 15

    r = client.post("/api/v1/inventory/adjust",
                    json={"product_id": p["id"], "new_stock": 12, "reason": "Kiểm kê"},
                    headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["stock"] == 12


def test_movement_history_recorded(client, admin_token):
    p, token = _make_product(client, admin_token, stock=5)
    client.post("/api/v1/inventory/receive",
                json={"product_id": p["id"], "quantity": 10, "reason": "Nhập kho"},
                headers=auth_headers(token))
    r = client.get(f"/api/v1/inventory/movements?product_id={p['id']}",
                   headers=auth_headers(token))
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert items[0]["quantity"] == 10
    assert items[0]["type"] == "in"


def test_coupon_crud_and_validate(client, admin_token):
    _, token = admin_token
    uid = uuid.uuid4().hex[:6].upper()
    code = f"TEST{uid}"
    now = datetime.now(timezone.utc)
    r = client.post("/api/v1/coupons", json={
        "code": code, "description": "Test coupon", "type": "percent", "value": 10,
        "min_order": 100000, "usage_limit": 5,
        "start_date": (now - timedelta(days=1)).isoformat(),
        "end_date": (now + timedelta(days=30)).isoformat(),
    }, headers=auth_headers(token))
    assert r.status_code == 201, r.text

    r = client.post("/api/v1/coupons/validate",
                    json={"code": code, "subtotal": 1000000})
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert int(data["discount"]) == 100000

    # Below min_order -> invalid.
    r = client.post("/api/v1/coupons/validate",
                    json={"code": code, "subtotal": 50000})
    assert r.json()["ok"] is False


def test_dashboard_summary(client, admin_token):
    _, token = admin_token
    r = client.get("/api/v1/dashboard/summary", headers=auth_headers(token))
    assert r.status_code == 200
    data = r.json()
    for key in ["revenue", "orders", "products", "low_stock",
                "daily_revenue", "status_distribution", "recent_orders", "best_sellers"]:
        assert key in data, f"missing {key}"
    assert len(data["daily_revenue"]) == 14
