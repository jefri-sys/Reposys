from utils.api_client import APIClient


client = APIClient()


# =========================================================
# HELPER
# =========================================================

def assert_unauthorized(response):
    assert response.status_code in (401, 403), (
        f"Expected 401/403 but received {response.status_code}: "
        f"{response.text}"
    )


# =========================================================
# AUTHENTICATION / AUTHORIZATION
# =========================================================

def test_orders_requires_authentication():
    response = client.get("/orders")
    assert_unauthorized(response)


def test_create_order_requires_authentication():
    response = client.post(
        "/orders/create",
        json={}
    )
    assert_unauthorized(response)


def test_documents_requires_authentication():
    response = client.get("/documents")
    assert_unauthorized(response)


def test_notifications_requires_authentication():
    response = client.get("/notifications")
    assert_unauthorized(response)


def test_wallet_requires_authentication():
    response = client.get("/wallet")
    assert_unauthorized(response)


def test_complaints_requires_authentication():
    response = client.get("/complaints")
    assert_unauthorized(response)


# =========================================================
# ADMIN ENDPOINT PROTECTION
# =========================================================

def test_admin_users_requires_authentication():
    response = client.get("/admin/users")
    assert_unauthorized(response)


def test_admin_analytics_requires_authentication():
    response = client.get("/admin/analytics")
    assert_unauthorized(response)


def test_admin_transactions_requires_authentication():
    response = client.get("/admin/transactions")
    assert_unauthorized(response)


def test_admin_complaints_requires_authentication():
    response = client.get("/admin/complaints")
    assert_unauthorized(response)


def test_admin_inventory_requires_authentication():
    response = client.get("/admin/inventory")
    assert_unauthorized(response)


# =========================================================
# PAYMENT SECURITY
# =========================================================

def test_payment_creation_requires_authentication():
    response = client.post(
        "/payments/create-order",
        json={}
    )
    assert_unauthorized(response)


def test_payment_verification_requires_authentication():
    response = client.post(
        "/payments/verify",
        json={}
    )
    assert_unauthorized(response)


def test_cash_payment_requires_authentication():
    response = client.post(
        "/payments/cash-confirm",
        json={}
    )
    assert_unauthorized(response)


def test_invalid_razorpay_webhook_signature():
    response = client.post(
        "/payments/webhook",
        data=b'{"event":"payment.captured","payload":{"payment":{"entity":{}}}}',
        headers={
            "Content-Type": "application/json",
            "x-razorpay-signature": "invalid-test-signature"
        }
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Invalid webhook signature"


# =========================================================
# INVALID INPUT
# =========================================================

def test_register_missing_required_fields():
    response = client.post(
        "/auth/register",
        json={}
    )

    assert response.status_code == 400


def test_login_missing_credentials():
    response = client.post(
        "/auth/login",
        json={}
    )

    assert response.status_code in (400, 401)


def test_login_invalid_credentials():
    response = client.post(
        "/auth/login",
        json={
            "email": "security-test-invalid@example.com",
            "password": "DefinitelyWrongPassword123!"
        }
    )

    assert response.status_code in (400, 401)


# =========================================================
# INVALID RESOURCE ACCESS
# =========================================================

def test_invalid_order_id_without_authentication():
    response = client.get(
        "/orders/000000000000000000000000"
    )

    assert_unauthorized(response)


def test_invalid_document_id_without_authentication():
    response = client.get(
        "/documents/000000000000000000000000"
    )

    assert_unauthorized(response)