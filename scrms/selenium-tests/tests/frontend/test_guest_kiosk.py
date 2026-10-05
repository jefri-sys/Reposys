from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from utils.config import BASE_URL


def wait_for_body(driver):
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )


# ============================================================
# GUEST KIOSK
# ============================================================

def test_guest_kiosk_page_loads(driver):
    driver.get(f"{BASE_URL}/guest")
    wait_for_body(driver)

    assert "/guest" in driver.current_url

    assert driver.find_element(
        By.XPATH,
        "//*[contains(text(), 'Reposys Guest Kiosk')]"
    ).is_displayed()

    assert driver.find_element(
        By.XPATH,
        "//*[contains(text(), 'Start guest access')]"
    ).is_displayed()


def test_guest_email_field_accepts_input(driver):
    driver.get(f"{BASE_URL}/guest")
    wait_for_body(driver)

    email = driver.find_element(
        By.CSS_SELECTOR,
        "input[type='email']"
    )

    email.send_keys("guest.selenium@example.com")

    assert email.get_attribute("value") == "guest.selenium@example.com"


def test_guest_email_invalid_format(driver):
    driver.get(f"{BASE_URL}/guest")
    wait_for_body(driver)

    email = driver.find_element(
        By.CSS_SELECTOR,
        "input[type='email']"
    )

    email.send_keys("invalid-email")

    button = driver.find_element(
        By.XPATH,
        "//button[contains(., 'Send Guest OTP')]"
    )

    button.click()

    # Browser email validation should prevent submission.
    assert "/guest" in driver.current_url
    assert email.get_attribute("value") == "invalid-email"


def test_guest_sign_in_link(driver):
    driver.get(f"{BASE_URL}/guest")
    wait_for_body(driver)

    login_link = driver.find_element(
        By.CSS_SELECTOR,
        "a[href='/login']"
    )

    login_link.click()

    WebDriverWait(driver, 10).until(
        EC.url_contains("/login")
    )

    assert "/login" in driver.current_url


def test_guest_track_empty_order_id(driver):
    driver.get(f"{BASE_URL}/guest")
    wait_for_body(driver)

    track_button = driver.find_element(
        By.XPATH,
        "//button[contains(., 'Track Order')]"
    )

    track_button.click()

    error = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Please enter an Order ID')]"
            )
        )
    )

    assert error.is_displayed()
    assert "/guest" in driver.current_url


def test_guest_track_order_id_navigation(driver):
    driver.get(f"{BASE_URL}/guest")
    wait_for_body(driver)

    inputs = driver.find_elements(
        By.CSS_SELECTOR,
        "input"
    )

    # The tracking input is the second input on the initial guest page.
    tracking_input = inputs[-1]

    tracking_input.send_keys("SELENIUM-INVALID-ORDER")

    track_button = driver.find_element(
        By.XPATH,
        "//button[contains(., 'Track Order')]"
    )

    track_button.click()

    WebDriverWait(driver, 10).until(
        EC.url_contains("/guest/track/SELENIUM-INVALID-ORDER")
    )

    assert "/guest/track/SELENIUM-INVALID-ORDER" in driver.current_url


# ============================================================
# PUBLIC TRACK PAGE
# ============================================================

def test_public_track_invalid_order(driver):
    driver.get(
        f"{BASE_URL}/guest/track/SELENIUM-INVALID-ORDER"
    )

    error = WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Order not found')]"
            )
        )
    )

    assert error.is_displayed()


def test_public_track_go_to_home(driver):
    driver.get(
        f"{BASE_URL}/guest/track/SELENIUM-INVALID-ORDER"
    )

    WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Order not found')]"
            )
        )
    )

    home_link = driver.find_element(
        By.CSS_SELECTOR,
        "a[href='/']"
    )

    home_link.click()

    WebDriverWait(driver, 10).until(
        EC.url_to_be(f"{BASE_URL}/")
    )

    assert driver.current_url == f"{BASE_URL}/"


# ============================================================
# GENERAL /track PAGE
# ============================================================

def test_track_page_without_order_id(driver):
    driver.get(f"{BASE_URL}/track")
    wait_for_body(driver)

    heading = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Track Your Order')]"
            )
        )
    )

    assert heading.is_displayed()

    order_input = driver.find_element(
        By.CSS_SELECTOR,
        "input[placeholder='Enter your Order ID']"
    )

    assert order_input.is_displayed()


def test_track_page_invalid_order(driver):
    driver.get(
        f"{BASE_URL}/track?orderId=SELENIUM-INVALID-ORDER"
    )

    error = WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Order not found or has expired')]"
            )
        )
    )

    assert error.is_displayed()


def test_track_page_empty_submission(driver):
    driver.get(f"{BASE_URL}/track")
    wait_for_body(driver)

    order_input = driver.find_element(
        By.CSS_SELECTOR,
        "input[placeholder='Enter your Order ID']"
    )

    track_button = driver.find_element(
        By.XPATH,
        "//button[contains(., 'Track Order')]"
    )

    assert order_input.is_displayed()
    assert track_button.is_displayed()

    # Required HTML validation should prevent submission.
    track_button.click()

    assert "/track" in driver.current_url