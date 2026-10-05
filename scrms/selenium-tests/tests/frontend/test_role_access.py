import os
import pytest

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from pages.login_page import LoginPage
from utils.config import BASE_URL


# ---------------------------------------------------------
# TEST ACCOUNTS
# Add these values to your .env file before running.
# ---------------------------------------------------------

STUDENT_EMAIL = os.getenv("TEST_STUDENT_EMAIL")
STUDENT_PASSWORD = os.getenv("TEST_STUDENT_PASSWORD")

FACULTY_EMAIL = os.getenv("TEST_FACULTY_EMAIL")
FACULTY_PASSWORD = os.getenv("TEST_FACULTY_PASSWORD")

STAFF_EMAIL = os.getenv("TEST_STAFF_EMAIL")
STAFF_PASSWORD = os.getenv("TEST_STAFF_PASSWORD")

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD")


def login(driver, email, password):
    """Login using the actual application login page."""
    page = LoginPage(driver)
    page.open(BASE_URL)
    page.enter_email(email)
    page.enter_password(password)
    page.click_login()

    WebDriverWait(driver, 10).until(
        lambda d: "/login" not in d.current_url
    )


def assert_route_allowed(driver, route):
    """Verify the authenticated user can access the route."""
    driver.get(f"{BASE_URL}{route}")

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(("tag name", "body"))
    )

    assert "/login" not in driver.current_url, (
        f"Authenticated user was redirected from allowed route: {route}"
    )


def assert_route_blocked(driver, route):
    """Verify the authenticated user cannot access the route."""
    driver.get(f"{BASE_URL}{route}")

    WebDriverWait(driver, 10).until(
        lambda d: d.current_url != f"{BASE_URL}{route}"
        or "/login" in d.current_url
    )

    assert route not in driver.current_url or "/login" in driver.current_url, (
        f"Unauthorized user was able to access: {route}"
    )


# =========================================================
# STUDENT
# =========================================================

@pytest.mark.skipif(
    not STUDENT_EMAIL or not STUDENT_PASSWORD,
    reason="TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not configured"
)
def test_student_can_access_student_routes(driver):
    login(driver, STUDENT_EMAIL, STUDENT_PASSWORD)

    routes = [
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

    for route in routes:
        assert_route_allowed(driver, route)


@pytest.mark.skipif(
    not STUDENT_EMAIL or not STUDENT_PASSWORD,
    reason="TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not configured"
)
def test_student_cannot_access_staff_routes(driver):
    login(driver, STUDENT_EMAIL, STUDENT_PASSWORD)

    routes = [
        "/staff",
        "/staff/queue",
        "/staff/reports",
        "/staff/notifications",
    ]

    for route in routes:
        assert_route_blocked(driver, route)


@pytest.mark.skipif(
    not STUDENT_EMAIL or not STUDENT_PASSWORD,
    reason="TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not configured"
)
def test_student_cannot_access_admin_routes(driver):
    login(driver, STUDENT_EMAIL, STUDENT_PASSWORD)

    routes = [
        "/admin",
        "/admin/users",
        "/admin/analytics",
        "/admin/transactions",
        "/admin/activity-logs",
        "/admin/automation-logs",
        "/admin/complaints",
        "/admin/inventory",
        "/admin/staff-reports",
        "/admin/notifications",
        "/admin/inquiries",
    ]

    for route in routes:
        assert_route_blocked(driver, route)


# =========================================================
# FACULTY
# =========================================================

@pytest.mark.skipif(
    not FACULTY_EMAIL or not FACULTY_PASSWORD,
    reason="TEST_FACULTY_EMAIL / TEST_FACULTY_PASSWORD not configured"
)
def test_faculty_can_access_student_routes(driver):
    login(driver, FACULTY_EMAIL, FACULTY_PASSWORD)

    routes = [
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

    for route in routes:
        assert_route_allowed(driver, route)


@pytest.mark.skipif(
    not FACULTY_EMAIL or not FACULTY_PASSWORD,
    reason="TEST_FACULTY_EMAIL / TEST_FACULTY_PASSWORD not configured"
)
def test_faculty_cannot_access_staff_routes(driver):
    login(driver, FACULTY_EMAIL, FACULTY_PASSWORD)

    routes = [
        "/staff",
        "/staff/queue",
        "/staff/reports",
        "/staff/notifications",
    ]

    for route in routes:
        assert_route_blocked(driver, route)


@pytest.mark.skipif(
    not FACULTY_EMAIL or not FACULTY_PASSWORD,
    reason="TEST_FACULTY_EMAIL / TEST_FACULTY_PASSWORD not configured"
)
def test_faculty_cannot_access_admin_routes(driver):
    login(driver, FACULTY_EMAIL, FACULTY_PASSWORD)

    routes = [
        "/admin",
        "/admin/users",
        "/admin/analytics",
        "/admin/transactions",
        "/admin/activity-logs",
        "/admin/automation-logs",
        "/admin/complaints",
        "/admin/inventory",
        "/admin/staff-reports",
        "/admin/notifications",
        "/admin/inquiries",
    ]

    for route in routes:
        assert_route_blocked(driver, route)


# =========================================================
# STAFF
# =========================================================

@pytest.mark.skipif(
    not STAFF_EMAIL or not STAFF_PASSWORD,
    reason="TEST_STAFF_EMAIL / TEST_STAFF_PASSWORD not configured"
)
def test_staff_can_access_staff_routes(driver):
    login(driver, STAFF_EMAIL, STAFF_PASSWORD)

    routes = [
        "/staff",
        "/staff/queue",
        "/staff/reports",
        "/staff/notifications",
    ]

    for route in routes:
        assert_route_allowed(driver, route)


@pytest.mark.skipif(
    not STAFF_EMAIL or not STAFF_PASSWORD,
    reason="TEST_STAFF_EMAIL / TEST_STAFF_PASSWORD not configured"
)
def test_staff_cannot_access_admin_routes(driver):
    login(driver, STAFF_EMAIL, STAFF_PASSWORD)

    routes = [
        "/admin",
        "/admin/users",
        "/admin/analytics",
        "/admin/transactions",
        "/admin/activity-logs",
        "/admin/automation-logs",
        "/admin/complaints",
        "/admin/inventory",
        "/admin/staff-reports",
        "/admin/notifications",
        "/admin/inquiries",
    ]

    for route in routes:
        assert_route_blocked(driver, route)


# =========================================================
# ADMIN
# =========================================================

@pytest.mark.skipif(
    not ADMIN_EMAIL or not ADMIN_PASSWORD,
    reason="TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not configured"
)
def test_admin_can_access_admin_routes(driver):
    login(driver, ADMIN_EMAIL, ADMIN_PASSWORD)

    routes = [
        "/admin",
        "/admin/users",
        "/admin/analytics",
        "/admin/transactions",
        "/admin/activity-logs",
        "/admin/automation-logs",
        "/admin/complaints",
        "/admin/inventory",
        "/admin/staff-reports",
        "/admin/notifications",
        "/admin/inquiries",
    ]

    for route in routes:
        assert_route_allowed(driver, route)


@pytest.mark.skipif(
    not ADMIN_EMAIL or not ADMIN_PASSWORD,
    reason="TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not configured"
)
def test_admin_can_access_staff_routes(driver):
    login(driver, ADMIN_EMAIL, ADMIN_PASSWORD)

    routes = [
        "/staff",
        "/staff/queue",
        "/staff/reports",
        "/staff/notifications",
    ]

    for route in routes:
        assert_route_allowed(driver, route)