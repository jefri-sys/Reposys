from selenium import webdriver
from selenium.webdriver.chrome.options import Options

from utils.config import BROWSER


def create_driver():
    if BROWSER.lower() != "chrome":
        raise ValueError(f"Unsupported browser: {BROWSER}")

    options = Options()

    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")

    driver = webdriver.Chrome(options=options)

    driver.set_page_load_timeout(30)
    driver.implicitly_wait(0)

    return driver