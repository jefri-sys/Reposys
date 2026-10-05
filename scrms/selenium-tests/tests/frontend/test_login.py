from selenium.webdriver.common.by import By

from pages.login_page import LoginPage
from utils.config import BASE_URL


def test_login_page_loads(driver):
    login_page = LoginPage(driver)
    login_page.open(BASE_URL)

    assert "/login" in driver.current_url
    assert driver.find_element(*LoginPage.EMAIL).is_displayed()
    assert driver.find_element(*LoginPage.PASSWORD).is_displayed()
    assert driver.find_element(*LoginPage.SUBMIT).is_displayed()


def test_login_email_field_accepts_input(driver):
    login_page = LoginPage(driver)
    login_page.open(BASE_URL)

    login_page.enter_email("test@example.com")

    email = driver.find_element(*LoginPage.EMAIL)
    assert email.get_attribute("value") == "test@example.com"


def test_login_password_field_accepts_input(driver):
    login_page = LoginPage(driver)
    login_page.open(BASE_URL)

    login_page.enter_password("TestPassword123!")

    password = driver.find_element(*LoginPage.PASSWORD)
    assert password.get_attribute("value") == "TestPassword123!"


def test_login_empty_submission(driver):
    login_page = LoginPage(driver)
    login_page.open(BASE_URL)

    login_page.click_login()

    # The application should remain on the login page
    # when required credentials are missing.
    assert "/login" in driver.current_url