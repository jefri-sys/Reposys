from utils.api_client import APIClient


def assert_unauthorized(response):
    assert response.status_code in (401, 403)


def test_create_payment_order_without_authentication():
    client = APIClient()

    response = client.post(
        "/payments/create-order",
        json={}
    )

    assert_unauthorized(response)


def test_verify_payment_without_authentication():
    client = APIClient()

    response = client.post(
        "/payments/verify",
        json={}
    )

    assert_unauthorized(response)


def test_cash_confirm_without_authentication():
    client = APIClient()

    response = client.post(
        "/payments/cash-confirm",
        json={}
    )

    assert_unauthorized(response)


def test_verify_payment_missing_details_without_authentication():
    client = APIClient()

    response = client.post(
        "/payments/verify",
        json={
            "razorpayOrderId": "test_order",
            "razorpayPaymentId": "test_payment"
        }
    )

    assert_unauthorized(response)


def test_webhook_invalid_signature():
    client = APIClient()

    response = client.post(
        "/payments/webhook",
        data=b'{"event":"payment.captured","payload":{"payment":{"entity":{}}}}',
        headers={
            "Content-Type": "application/json",
            "x-razorpay-signature": "invalid-test-signature"
        }
    )

    assert response.status_code == 400

    data = response.json()
    assert data["message"] == "Invalid webhook signature"