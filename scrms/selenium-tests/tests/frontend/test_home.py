from selenium.webdriver.common.by import By


def test_home_page_loads(driver):
    driver.get("http://localhost:3000/")

    assert "Reposys" in driver.title

    body = driver.find_element(By.TAG_NAME, "body")

    assert body.is_displayed()