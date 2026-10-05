from utils.api_client import APIClient


def assert_unauthorized(response):
    assert response.status_code in (401, 403)


def test_order_estimate_missing_data():
    client = APIClient()

    response = client.post("/orders/estimate", json={})

    assert response.status_code >= 400
    assert response.status_code < 500


def test_public_order_tracking_invalid_id():
    client = APIClient()

    response = client.get(
        "/orders/track/000000000000000000000000"
    )

    assert response.status_code == 404

    data = response.json()
    assert data["success"] is False
    assert data["message"] == "Order not found"


def test_public_order_tracking_invalid_token():
    client = APIClient()

    response = client.get(
        "/orders/track/INVALID-SELENIUM-ORDER"
    )

    assert response.status_code == 404

    data = response.json()
    assert data["success"] is False
    assert data["message"] == "Order not found"


def test_my_orders_without_authentication():
    client = APIClient()

    response = client.get("/orders/my-orders")

    assert_unauthorized(response)


def test_create_order_without_authentication():
    client = APIClient()

    response = client.post("/orders/create", json={})

    assert_unauthorized(response)


def test_order_detail_without_authentication():
    client = APIClient()

    response = client.get("/orders/not-a-valid-order-id")

    assert_unauthorized(response)


def test_order_wait_without_authentication():
    client = APIClient()

    response = client.get(
        "/orders/not-a-valid-order-id/wait"
    )

    assert_unauthorized(response)


def test_order_cancel_without_authentication():
    client = APIClient()

    response = client.patch(
        "/orders/not-a-valid-order-id/cancel",
        json={}
    )

    assert_unauthorized(response)