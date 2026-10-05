from selenium.webdriver.common.by import By

from pages.register_page import RegisterPage
from utils.config import BASE_URL


def test_register_page_loads(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    assert "/register" in driver.current_url

    assert driver.find_element(*RegisterPage.NAME).is_displayed()
    assert driver.find_element(*RegisterPage.COLLEGE_ID).is_displayed()
    assert driver.find_element(*RegisterPage.EMAIL).is_displayed()
    assert driver.find_element(*RegisterPage.DEPARTMENT).is_displayed()
    assert driver.find_element(*RegisterPage.PHONE).is_displayed()
    assert driver.find_element(*RegisterPage.PASSWORD).is_displayed()
    assert driver.find_element(*RegisterPage.CONFIRM_PASSWORD).is_displayed()
    assert driver.find_element(*RegisterPage.TERMS).is_displayed()
    assert driver.find_element(*RegisterPage.SUBMIT).is_displayed()


def test_register_name_field(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.enter_name("Selenium Test User")

    field = driver.find_element(*RegisterPage.NAME)

    assert field.get_attribute("value") == "Selenium Test User"


def test_register_college_id_field(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.enter_college_id("SELTEST001")

    field = driver.find_element(*RegisterPage.COLLEGE_ID)

    assert field.get_attribute("value") == "SELTEST001"


def test_register_email_field(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.enter_email("selenium@example.com")

    field = driver.find_element(*RegisterPage.EMAIL)

    assert field.get_attribute("value") == "selenium@example.com"


def test_register_phone_field(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.enter_phone("9876543210")

    field = driver.find_element(*RegisterPage.PHONE)

    assert field.get_attribute("value") == "9876543210"


def test_student_role_selection(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.select_student()

    student = driver.find_element(*RegisterPage.STUDENT_ROLE)

    assert student.is_selected()


def test_faculty_role_selection(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.select_faculty()

    faculty = driver.find_element(*RegisterPage.FACULTY_ROLE)

    assert faculty.is_selected()


def test_password_fields(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    password = "TestPassword123!"

    register_page.enter_password(password)
    register_page.enter_confirm_password(password)

    password_field = driver.find_element(*RegisterPage.PASSWORD)
    confirm_field = driver.find_element(*RegisterPage.CONFIRM_PASSWORD)

    assert password_field.get_attribute("value") == password
    assert confirm_field.get_attribute("value") == password


def test_terms_checkbox(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    terms = driver.find_element(*RegisterPage.TERMS)

    assert not terms.is_selected()

    register_page.accept_terms()

    assert terms.is_selected()


def test_password_mismatch_validation(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.enter_password("TestPassword123!")
    register_page.enter_confirm_password("DifferentPassword123!")

    register_page.submit()

    # Registration should not proceed with mismatched passwords.
    assert "/register" in driver.current_url


def test_empty_registration_submission(driver):
    register_page = RegisterPage(driver)
    register_page.open(BASE_URL)

    register_page.submit()

    # Required fields should prevent a successful registration.
    assert "/register" in driver.current_url