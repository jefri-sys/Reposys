from utils.api_client import APIClient


def test_login_missing_credentials():
    client = APIClient()

    response = client.post(
        "/auth/login",
        json={}
    )

    assert response.status_code >= 400
    assert response.status_code < 500


def test_login_invalid_credentials():
    client = APIClient()

    response = client.post(
        "/auth/login",
        json={
            "email": "nonexistent.selenium@example.com",
            "password": "DefinitelyWrong123!"
        }
    )

    assert response.status_code >= 400
    assert response.status_code < 500


def test_register_missing_fields():
    client = APIClient()

    response = client.post(
        "/auth/register",
        json={}
    )

    assert response.status_code >= 400
    assert response.status_code < 500


def test_forgot_password_missing_email():
    client = APIClient()

    response = client.post(
        "/auth/forgot-password",
        json={}
    )

    assert response.status_code >= 400
    assert response.status_code < 500


def test_me_without_authentication():
    client = APIClient()

    response = client.get("/auth/me")

    assert response.status_code in (401, 403)

def test_logout_without_authentication():
    client = APIClient()

    response = client.post("/auth/logout")

    assert response.status_code in (401, 403)