import os

import pytest

from utils.driver import create_driver


SCREENSHOT_DIR = "screenshots"


@pytest.fixture
def driver(request):
    driver = create_driver()

    yield driver

    if hasattr(request.node, "rep_call") and request.node.rep_call.failed:
        os.makedirs(SCREENSHOT_DIR, exist_ok=True)

        filename = os.path.join(
            SCREENSHOT_DIR,
            f"{request.node.name}.png"
        )

        driver.save_screenshot(filename)

    driver.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when == "call":
        setattr(item, "rep_call", report)