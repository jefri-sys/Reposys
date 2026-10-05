from utils.api_client import APIClient


def test_backend_health():
    client = APIClient()

    response = client.get("/health")

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["service"] == "reposys-backend"