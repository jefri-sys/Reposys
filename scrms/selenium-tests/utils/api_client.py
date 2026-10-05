import requests

from utils.config import API_URL


class APIClient:

    def __init__(self):
        self.session = requests.Session()

    def get(self, endpoint, **kwargs):
        return self.session.get(
            f"{API_URL}{endpoint}",
            **kwargs
        )

    def post(self, endpoint, **kwargs):
        return self.session.post(
            f"{API_URL}{endpoint}",
            **kwargs
        )

    def put(self, endpoint, **kwargs):
        return self.session.put(
            f"{API_URL}{endpoint}",
            **kwargs
        )

    def patch(self, endpoint, **kwargs):
        return self.session.patch(
            f"{API_URL}{endpoint}",
            **kwargs
        )

    def delete(self, endpoint, **kwargs):
        return self.session.delete(
            f"{API_URL}{endpoint}",
            **kwargs
        )