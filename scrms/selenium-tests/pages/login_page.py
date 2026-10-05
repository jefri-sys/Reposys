from selenium.webdriver.common.by import By

from utils.waits import wait_for_element, wait_for_clickable


class LoginPage:

    EMAIL = (By.NAME, "email")
    PASSWORD = (By.NAME, "password")
    REMEMBER = (By.ID, "remember")
    SUBMIT = (By.CSS_SELECTOR, "button[type='submit']")
    REGISTER_LINK = (By.CSS_SELECTOR, "a[href='/register']")
    GUEST_LINK = (By.CSS_SELECTOR, "a[href='/guest']")

    def __init__(self, driver):
        self.driver = driver

    def open(self, base_url):
        self.driver.get(f"{base_url}/login")

    def enter_email(self, email):
        element = wait_for_element(self.driver, self.EMAIL)
        element.clear()
        element.send_keys(email)

    def enter_password(self, password):
        element = wait_for_element(self.driver, self.PASSWORD)
        element.clear()
        element.send_keys(password)

    def click_login(self):
        wait_for_clickable(
            self.driver,
            self.SUBMIT
        ).click()

    def login(self, email, password):
        self.enter_email(email)
        self.enter_password(password)
        self.click_login()