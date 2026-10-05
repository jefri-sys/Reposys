from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


DEFAULT_TIMEOUT = 10


def wait_for_element(driver, locator, timeout=DEFAULT_TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located(locator)
    )


def wait_for_clickable(driver, locator, timeout=DEFAULT_TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable(locator)
    )


def wait_for_presence(driver, locator, timeout=DEFAULT_TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located(locator)
    )


def wait_for_url_contains(driver, text, timeout=DEFAULT_TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.url_contains(text)
    )