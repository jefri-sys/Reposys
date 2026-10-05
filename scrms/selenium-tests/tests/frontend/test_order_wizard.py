from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from utils.config import BASE_URL


def test_order_wizard_requires_authentication(driver):
    driver.get(f"{BASE_URL}/orders/new")

    WebDriverWait(driver, 10).until(
        EC.url_contains("/login")
    )

    assert "/login" in driver.current_url


def test_my_orders_requires_authentication(driver):
    driver.get(f"{BASE_URL}/orders")

    WebDriverWait(driver, 10).until(
        EC.url_contains("/login")
    )

    assert "/login" in driver.current_url


def test_order_detail_requires_authentication(driver):
    driver.get(f"{BASE_URL}/orders/000000000000000000000000")

    WebDriverWait(driver, 10).until(
        EC.url_contains("/login")
    )

    assert "/login" in driver.current_url


def test_order_wizard_does_not_expose_order_form_to_guest(driver):
    driver.get(f"{BASE_URL}/orders/new")

    WebDriverWait(driver, 10).until(
        EC.url_contains("/login")
    )

    # Protected order creation UI must not be accessible
    # without Student/Faculty authentication.
    assert "/orders/new" not in driver.current_url

    body = driver.find_element(By.TAG_NAME, "body")
    assert body.is_displayed()