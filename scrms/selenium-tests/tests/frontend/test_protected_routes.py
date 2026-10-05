import pytest
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from utils.config import BASE_URL


PROTECTED_ROUTES = [
    "/dashboard",
    "/profile",
    "/wallet",
    "/notifications",
    "/settings",
    "/friends",
    "/chat",
    "/complaints",
    "/tools",
    "/orders",
    "/orders/new",
]


@pytest.mark.parametrize("route", PROTECTED_ROUTES)
def test_protected_student_routes_require_authentication(driver, route):
    driver.get(f"{BASE_URL}{route}")

    WebDriverWait(driver, 10).until(
        EC.url_contains("/login")
    )

    assert "/login" in driver.current_url
