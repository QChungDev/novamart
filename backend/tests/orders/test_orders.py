"""Order + checkout tests: totals, stock, status transitions, oversell."""

import uuid

from tests.conftest import auth_headers


def _make_product(client, admin_token, stock=10, price=1000000):
    uid = uuid.uuid4().hex[:8]
    _, token = admin_token
    r = client.post("/api/v1/products", json={
        "name": f"OrderProd {uid}", "slug": f"orderprod-{uid}",
        "sku": f"ORD-{uid.upper()}", "price": price, "stock": stock,
    }, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json()


def _checkout(client, token, product_id, qty=1, coupon=None):
    payload = {
        "items": [{"product_id": product_id, "quantity": qty}],
        "customer_name": "Buyer", "phone": "0903000000",
        "email": "buyer@novamart.vn", "street": "1 Đường Test",
        "district": "Quận 1", "city": "TP.HCM",
    }
    if coupon:
        payload["coupon_code"] = coupon
    return client.post("/api/v1/orders/checkout", json=payload,
                       headers=auth_headers(token) if token else {})


def test_checkout_calculates_total_server_side(client, customer_token, admin_token):
    p = _make_product(client, admin_token, stock=10, price=2000000)
    _, token = customer_token
    r = _checkout(client, token, p["id"], qty=2)
    assert r.status_code == 201, r.text
    order = r.json()
    assert int(order["subtotal"]) == 4000000
    assert int(order["total"]) == 4000000  # free shipping over 500K
    assert order["status"] == "pending"
    # Price snapshot on items.
    assert int(order["items"][0]["price"]) == 2000000


def test_checkout_rejects_insufficient_stock(client, customer_token, admin_token):
    p = _make_product(client, admin_token, stock=2, price=500000)
    _, token = customer_token
    r = _checkout(client, token, p["id"], qty=5)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "insufficient_stock"


def test_checkout_decrements_stock(client, customer_token, admin_token):
    p = _make_product(client, admin_token, stock=10, price=500000)
    _, token = customer_token
    _checkout(client, token, p["id"], qty=3)
    r = client.get(f"/api/v1/products/{p['slug']}")
    assert int(r.json()["stock"]) == 7


def test_cancel_restores_stock(client, customer_token, admin_token):
    p = _make_product(client, admin_token, stock=10, price=500000)
    _, token = customer_token
    r = _checkout(client, token, p["id"], qty=3)
    code = r.json()["code"]
    r = client.post(f"/api/v1/orders/{code}/cancel", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"
    r = client.get(f"/api/v1/products/{p['slug']}")
    assert int(r.json()["stock"]) == 10


def test_illegal_status_transition_rejected(client, admin_token):
    p = _make_product(client, admin_token, stock=10, price=500000)
    _, atoken = admin_token
    # Create order as guest.
    r = _checkout(client, None, p["id"], qty=1)
    order_id = r.json()["id"]
    # pending -> delivered is illegal.
    r = client.patch(f"/api/v1/orders/{order_id}/status",
                     json={"status": "delivered"},
                     headers=auth_headers(atoken))
    assert r.status_code == 409


def test_admin_status_flow(client, admin_token):
    p = _make_product(client, admin_token, stock=10, price=500000)
    _, atoken = admin_token
    r = _checkout(client, None, p["id"], qty=1)
    order_id = r.json()["id"]
    for status in ["confirmed", "shipping", "delivered"]:
        r = client.patch(f"/api/v1/orders/{order_id}/status",
                         json={"status": status},
                         headers=auth_headers(atoken))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == status


def test_concurrent_checkout_no_oversell(client, admin_token, db):
    """Two checkouts racing for the last items: at most one succeeds fully.

    Uses separate DB sessions per thread (TestClient is not thread-safe).
    """
    import threading
    from app.modules.orders.schemas import CheckoutRequest
    from app.modules.orders.service import OrderService
    from tests.conftest import TestingSession

    p = _make_product(client, admin_token, stock=3, price=500000)
    results = []

    def buy():
        session = TestingSession()
        try:
            payload = CheckoutRequest(
                items=[{"product_id": p["id"], "quantity": 2}],
                customer_name="Racer", phone="0903000000",
                email="racer@novamart.vn", street="1 Đường Test",
                district="Quận 1", city="TP.HCM",
            )
            OrderService(session).checkout(None, payload)
            results.append("ok")
        except Exception as e:
            results.append(type(e).__name__)
        finally:
            session.close()

    threads = [threading.Thread(target=buy) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    # 3 in stock, each wants 2 -> exactly one must succeed.
    assert sorted(results) == ["InsufficientStockError", "ok"], results
