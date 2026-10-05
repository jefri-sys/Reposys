from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from utils.config import BASE_URL


def wait_for_page(driver):
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )


def test_home_page(driver):
    driver.get(f"{BASE_URL}/")
    wait_for_page(driver)

    assert "/" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()


def test_contact_page(driver):
    driver.get(f"{BASE_URL}/contact")
    wait_for_page(driver)

    assert "/contact" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()


def test_about_page(driver):
    driver.get(f"{BASE_URL}/about")
    wait_for_page(driver)

    assert "/about" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()


def test_privacy_page(driver):
    driver.get(f"{BASE_URL}/privacy")
    wait_for_page(driver)

    assert "/privacy" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()


def test_terms_page(driver):
    driver.get(f"{BASE_URL}/terms")
    wait_for_page(driver)

    assert "/terms" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()


def test_cookies_page(driver):
    driver.get(f"{BASE_URL}/cookies")
    wait_for_page(driver)

    assert "/cookies" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()


def test_help_page(driver):
    driver.get(f"{BASE_URL}/help")
    wait_for_page(driver)

    assert "/help" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()


def test_login_navigation_from_direct_url(driver):
    driver.get(f"{BASE_URL}/login")
    wait_for_page(driver)

    assert "/login" in driver.current_url


def test_register_navigation_from_direct_url(driver):
    driver.get(f"{BASE_URL}/register")
    wait_for_page(driver)

    assert "/register" in driver.current_url


def test_guest_page(driver):
    driver.get(f"{BASE_URL}/guest")
    wait_for_page(driver)

    assert "/guest" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()