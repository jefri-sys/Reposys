from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from utils.config import BASE_URL


def wait_for_body(driver):
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )


# ============================================================
# FORGOT PASSWORD
# ============================================================

def test_forgot_password_page_loads(driver):
    driver.get(f"{BASE_URL}/forgot-password")
    wait_for_body(driver)

    assert "/forgot-password" in driver.current_url
    assert driver.find_element(By.TAG_NAME, "body").is_displayed()

    email = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
    assert email.is_displayed()

    button = driver.find_element(
        By.CSS_SELECTOR,
        "button[type='submit']"
    )
    assert button.is_displayed()


def test_forgot_password_email_field_accepts_input(driver):
    driver.get(f"{BASE_URL}/forgot-password")
    wait_for_body(driver)

    email = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
    email.send_keys("selenium.test@example.com")

    assert email.get_attribute("value") == "selenium.test@example.com"


def test_forgot_password_empty_submission(driver):
    driver.get(f"{BASE_URL}/forgot-password")
    wait_for_body(driver)

    button = driver.find_element(
        By.CSS_SELECTOR,
        "button[type='submit']"
    )
    button.click()

    # Required HTML validation should prevent submission.
    assert "/forgot-password" in driver.current_url


def test_forgot_password_invalid_email(driver):
    driver.get(f"{BASE_URL}/forgot-password")
    wait_for_body(driver)

    email = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
    email.send_keys("invalid-email")

    button = driver.find_element(
        By.CSS_SELECTOR,
        "button[type='submit']"
    )
    button.click()

    # Browser email validation should prevent the form submission.
    assert "/forgot-password" in driver.current_url
    assert email.get_attribute("value") == "invalid-email"


def test_forgot_password_back_to_login(driver):
    driver.get(f"{BASE_URL}/forgot-password")
    wait_for_body(driver)

    back_link = driver.find_element(
        By.CSS_SELECTOR,
        "a[href='/login']"
    )
    back_link.click()

    WebDriverWait(driver, 10).until(
        EC.url_contains("/login")
    )

    assert "/login" in driver.current_url


# ============================================================
# RESET PASSWORD
# ============================================================

def test_reset_password_without_token(driver):
    driver.get(f"{BASE_URL}/reset-password")
    wait_for_body(driver)

    assert "/reset-password" in driver.current_url

    message = driver.find_element(
        By.XPATH,
        "//*[contains(text(), 'This reset link is incomplete')]"
    )

    assert message.is_displayed()


def test_reset_password_fields_without_token_are_disabled(driver):
    driver.get(f"{BASE_URL}/reset-password")
    wait_for_body(driver)

    new_password = driver.find_element(
        By.NAME,
        "newPassword"
    )

    confirm_password = driver.find_element(
        By.NAME,
        "confirmPassword"
    )

    assert new_password.is_enabled() is False
    assert confirm_password.is_enabled() is False


def test_reset_password_button_without_token_is_disabled(driver):
    driver.get(f"{BASE_URL}/reset-password")
    wait_for_body(driver)

    button = driver.find_element(
        By.CSS_SELECTOR,
        "button[type='submit']"
    )

    assert button.is_enabled() is False


def test_reset_password_with_fake_token_loads_form(driver):
    driver.get(
        f"{BASE_URL}/reset-password?token=SELENIUM-INVALID-TOKEN"
    )
    wait_for_body(driver)

    assert "/reset-password" in driver.current_url

    new_password = driver.find_element(
        By.NAME,
        "newPassword"
    )

    confirm_password = driver.find_element(
        By.NAME,
        "confirmPassword"
    )

    assert new_password.is_enabled()
    assert confirm_password.is_enabled()


def test_reset_password_weak_password_validation(driver):
    driver.get(
        f"{BASE_URL}/reset-password?token=SELENIUM-INVALID-TOKEN"
    )
    wait_for_body(driver)

    new_password = driver.find_element(
        By.NAME,
        "newPassword"
    )

    confirm_password = driver.find_element(
        By.NAME,
        "confirmPassword"
    )

    new_password.send_keys("weak")

    # Confirm field so the form can be submitted.
    confirm_password.send_keys("weak")

    button = driver.find_element(
        By.CSS_SELECTOR,
        "button[type='submit']"
    )
    button.click()

    error = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Password must be at least 8 characters')]"
            )
        )
    )

    assert error.is_displayed()


def test_reset_password_mismatch_validation(driver):
    driver.get(
        f"{BASE_URL}/reset-password?token=SELENIUM-INVALID-TOKEN"
    )
    wait_for_body(driver)

    new_password = driver.find_element(
        By.NAME,
        "newPassword"
    )

    confirm_password = driver.find_element(
        By.NAME,
        "confirmPassword"
    )

    new_password.send_keys("StrongPassword1!")

    confirm_password.send_keys("DifferentPassword1!")

    button = driver.find_element(
        By.CSS_SELECTOR,
        "button[type='submit']"
    )
    button.click()

    error = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Passwords do not match.')]"
            )
        )
    )

    assert error.is_displayed()


def test_reset_password_valid_password_criteria(driver):
    driver.get(
        f"{BASE_URL}/reset-password?token=SELENIUM-INVALID-TOKEN"
    )
    wait_for_body(driver)

    new_password = driver.find_element(
        By.NAME,
        "newPassword"
    )

    new_password.send_keys("StrongPassword1!")

    strong_label = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Strong password')]"
            )
        )
    )

    assert strong_label.is_displayed()


def test_reset_password_back_to_recovery(driver):
    driver.get(
        f"{BASE_URL}/reset-password?token=SELENIUM-INVALID-TOKEN"
    )
    wait_for_body(driver)

    back_link = driver.find_element(
        By.CSS_SELECTOR,
        "a[href='/forgot-password']"
    )

    back_link.click()

    WebDriverWait(driver, 10).until(
        EC.url_contains("/forgot-password")
    )

    assert "/forgot-password" in driver.current_url