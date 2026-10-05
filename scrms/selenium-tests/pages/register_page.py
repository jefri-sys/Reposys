from selenium.webdriver.common.by import By

from utils.waits import wait_for_element, wait_for_clickable


class RegisterPage:

    NAME = (By.NAME, "name")
    COLLEGE_ID = (By.NAME, "collegeId")
    EMAIL = (By.NAME, "email")
    DEPARTMENT = (By.NAME, "department")
    PHONE = (By.NAME, "phone")

    STUDENT_ROLE = (By.ID, "role-student")
    FACULTY_ROLE = (By.ID, "role-faculty")

    PASSWORD = (By.NAME, "password")
    CONFIRM_PASSWORD = (By.NAME, "confirmPassword")

    TERMS = (By.ID, "terms")

    SUBMIT = (By.CSS_SELECTOR, "button[type='submit']")

    STUDENT_LABEL = (
        By.CSS_SELECTOR,
        "label[for='role-student']"
    )

    FACULTY_LABEL = (
        By.CSS_SELECTOR,
        "label[for='role-faculty']"
    )

    def __init__(self, driver):
        self.driver = driver

    def open(self, base_url):
        self.driver.get(f"{base_url}/register")

    def enter_name(self, value):
        element = wait_for_element(self.driver, self.NAME)
        element.clear()
        element.send_keys(value)

    def enter_college_id(self, value):
        element = wait_for_element(self.driver, self.COLLEGE_ID)
        element.clear()
        element.send_keys(value)

    def enter_email(self, value):
        element = wait_for_element(self.driver, self.EMAIL)
        element.clear()
        element.send_keys(value)

    def enter_department(self, value):
        element = wait_for_element(self.driver, self.DEPARTMENT)
        element.clear()
        element.send_keys(value)

    def enter_phone(self, value):
        element = wait_for_element(self.driver, self.PHONE)
        element.clear()
        element.send_keys(value)

    def select_student(self):
        wait_for_clickable(
            self.driver,
            self.STUDENT_LABEL
        ).click()

    def select_faculty(self):
        wait_for_clickable(
            self.driver,
            self.FACULTY_LABEL
        ).click()

    def enter_password(self, value):
        element = wait_for_element(self.driver, self.PASSWORD)
        element.clear()
        element.send_keys(value)

    def enter_confirm_password(self, value):
        element = wait_for_element(
            self.driver,
            self.CONFIRM_PASSWORD
        )
        element.clear()
        element.send_keys(value)

    def accept_terms(self):
        terms = wait_for_element(self.driver, self.TERMS)

        if not terms.is_selected():
            wait_for_clickable(
                self.driver,
                self.TERMS
            ).click()

    def submit(self):
        wait_for_clickable(
            self.driver,
            self.SUBMIT
        ).click()

    def fill_valid_form(
        self,
        name,
        college_id,
        email,
        department,
        phone,
        password,
        confirm_password,
        role="Student"
    ):
        self.enter_name(name)
        self.enter_college_id(college_id)
        self.enter_email(email)
        self.enter_department(department)
        self.enter_phone(phone)

        if role == "Faculty":
            self.select_faculty()
        else:
            self.select_student()

        self.enter_password(password)
        self.enter_confirm_password(confirm_password)
        self.accept_terms()