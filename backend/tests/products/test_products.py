"""Product tests: CRUD, search, filter, pagination, validation."""

from tests.conftest import auth_headers


def _create_product(client, admin_token, **overrides):
    import uuid
    _, token = admin_token
    uid = uuid.uuid4().hex[:8]
    payload = {
        "name": f"Test Product {uid}",
        "slug": f"test-product-{uid}",
        "sku": f"TEST-{uid.upper()}",
        "price": 1000000,
        "stock": 50,
        "status": "active",
    }
    payload.update(overrides)
    r = client.post("/api/v1/products", json=payload, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json()


def test_public_product_list(client, admin_token):
    _create_product(client, admin_token)
    r = client.get("/api/v1/products?page_size=5")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert len(data["items"]) <= 5
    assert "effective_price" in data["items"][0]


def test_product_search(client, admin_token):
    _create_product(client, admin_token, name="Bàn phím cơ XYZ đặc biệt")
    r = client.get("/api/v1/products?q=bàn phím cơ XYZ")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_product_price_filter(client, admin_token):
    _create_product(client, admin_token, price=500000)
    _create_product(client, admin_token, price=5000000)
    r = client.get("/api/v1/products?min_price=1000000&max_price=2000000")
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert 1000000 <= int(item["effective_price"]) <= 2000000


def test_duplicate_sku_rejected(client, admin_token):
    p = _create_product(client, admin_token)
    import uuid
    uid = uuid.uuid4().hex[:8]
    _, token = admin_token
    r = client.post("/api/v1/products", json={
        "name": f"Dup {uid}", "slug": f"dup-{uid}", "sku": p["sku"],
        "price": 1000, "stock": 1,
    }, headers=auth_headers(token))
    assert r.status_code == 409


def test_sale_price_must_be_less_than_price(client, admin_token):
    import uuid
    uid = uuid.uuid4().hex[:8]
    _, token = admin_token
    r = client.post("/api/v1/products", json={
        "name": f"Bad {uid}", "slug": f"bad-{uid}", "sku": f"BAD-{uid.upper()}",
        "price": 1000000, "sale_price": 1200000, "stock": 1,
    }, headers=auth_headers(token))
    assert r.status_code == 422


def test_customer_cannot_create_product(client, customer_token):
    import uuid
    uid = uuid.uuid4().hex[:8]
    _, token = customer_token
    r = client.post("/api/v1/products", json={
        "name": f"No {uid}", "slug": f"no-{uid}", "sku": f"NO-{uid.upper()}",
        "price": 1000, "stock": 1,
    }, headers=auth_headers(token))
    assert r.status_code == 403


def test_admin_can_update_and_deactivate(client, admin_token):
    p = _create_product(client, admin_token)
    _, token = admin_token
    r = client.patch(f"/api/v1/products/{p['id']}", json={"price": 2000000},
                     headers=auth_headers(token))
    assert r.status_code == 200
    assert int(r.json()["price"]) == 2000000

    r = client.delete(f"/api/v1/products/{p['id']}", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["status"] == "inactive"

    # Inactive products hidden from public listing.
    r = client.get(f"/api/v1/products/{p['slug']}")
    assert r.status_code == 404
