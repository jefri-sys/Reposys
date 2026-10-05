from utils.api_client import APIClient


def assert_unauthorized(response):
    assert response.status_code in (401, 403)


def test_document_upload_without_authentication():
    client = APIClient()

    response = client.post("/documents/upload")

    assert_unauthorized(response)


def test_multiple_document_upload_without_authentication():
    client = APIClient()

    response = client.post("/documents/upload-multiple")

    assert_unauthorized(response)


def test_document_library_without_authentication():
    client = APIClient()

    response = client.get("/documents/library")

    assert_unauthorized(response)


def test_document_url_without_authentication():
    client = APIClient()

    response = client.get("/documents/not-a-valid-document-id/url")

    assert_unauthorized(response)