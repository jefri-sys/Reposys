import os

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from pages.login_page import LoginPage
from utils.config import BASE_URL


# =========================================================
# TEST CONFIGURATION
# =========================================================

STUDENT_EMAIL = os.getenv("TEST_STUDENT_EMAIL")
STUDENT_PASSWORD = os.getenv("TEST_STUDENT_PASSWORD")

TEST_PDF = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "test_data",
        "test_order.pdf"
    )
)


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def wait_for_body(driver):
    """Wait until the page body is available."""
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located(
            (By.TAG_NAME, "body")
        )
    )


def login(driver):
    """Login using the actual application login page."""

    page = LoginPage(driver)

    page.open(BASE_URL)

    page.enter_email(STUDENT_EMAIL)
    page.enter_password(STUDENT_PASSWORD)
    page.click_login()

    WebDriverWait(driver, 15).until(
        lambda d: "/login" not in d.current_url
    )


# =========================================================
# E2E TEST
# =========================================================

def test_student_order_upload_workflow(driver):
    """
    E2E workflow:

    Student Login
        ↓
    Dashboard
        ↓
    New Order
        ↓
    Upload PDF
        ↓
    Verify uploaded document
        ↓
    Wait for document analysis
        ↓
    Enable Configure
        ↓
    Configure Step
    """

    # -----------------------------------------------------
    # 1. Verify test credentials are configured
    # -----------------------------------------------------

    assert STUDENT_EMAIL, (
        "TEST_STUDENT_EMAIL is not configured in .env"
    )

    assert STUDENT_PASSWORD, (
        "TEST_STUDENT_PASSWORD is not configured in .env"
    )

    # -----------------------------------------------------
    # 2. Verify test PDF exists
    # -----------------------------------------------------

    assert os.path.exists(TEST_PDF), (
        f"Test PDF was not found: {TEST_PDF}"
    )

    # -----------------------------------------------------
    # 3. Login as Student
    # -----------------------------------------------------

    login(driver)

    assert "/login" not in driver.current_url

    # -----------------------------------------------------
    # 4. Open Dashboard
    # -----------------------------------------------------

    driver.get(
        f"{BASE_URL}/dashboard"
    )

    wait_for_body(driver)

    assert "/login" not in driver.current_url

    # -----------------------------------------------------
    # 5. Open New Order
    # -----------------------------------------------------

    driver.get(
        f"{BASE_URL}/orders/new"
    )

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Upload source documents')]"
            )
        )
    )

    assert "/orders/new" in driver.current_url

    # -----------------------------------------------------
    # 6. Locate file input
    # -----------------------------------------------------

    file_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(
            (
                By.CSS_SELECTOR,
                "input[type='file']"
            )
        )
    )

    # -----------------------------------------------------
    # 7. Upload test PDF
    # -----------------------------------------------------

    file_input.send_keys(TEST_PDF)

    # -----------------------------------------------------
    # 8. Wait for uploaded filename
    # -----------------------------------------------------

    WebDriverWait(driver, 30).until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'test_order.pdf')]"
            )
        )
    )

    # -----------------------------------------------------
    # 9. Verify uploaded document is visible
    # -----------------------------------------------------

    uploaded_document = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'test_order.pdf')]"
            )
        )
    )

    assert uploaded_document.is_displayed()

    # -----------------------------------------------------
    # 10. Locate Next: Configure button
    # -----------------------------------------------------

    next_button = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//button[contains(., 'Next: Configure')]"
            )
        )
    )

    # -----------------------------------------------------
    # 11. Wait for document analysis/upload processing
    # -----------------------------------------------------
    #
    # Filename appearing does not necessarily mean that
    # the upload and analysis process has completed.
    #
    # Give the application up to 30 seconds to enable
    # the Configure button.
    # -----------------------------------------------------

    WebDriverWait(driver, 30).until(
        lambda d: next_button.is_enabled()
    )

    # -----------------------------------------------------
    # 12. Verify Configure button is enabled
    # -----------------------------------------------------

    assert next_button.is_enabled()

    # -----------------------------------------------------
    # 13. Move to Configure step
    # -----------------------------------------------------

    next_button.click()

    # -----------------------------------------------------
    # 14. Wait for Configure step
    # -----------------------------------------------------

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//*[contains(text(), 'Configure')]"
            )
        )
    )

    # -----------------------------------------------------
    # 15. Verify we remain inside Order Wizard
    # -----------------------------------------------------

    assert "/orders/new" in driver.current_url

    # -----------------------------------------------------
    # 16. Verify Configure step is visible
    # -----------------------------------------------------

    assert driver.find_element(
        By.XPATH,
        "//*[contains(text(), 'Configure')]"
    ).is_displayed()