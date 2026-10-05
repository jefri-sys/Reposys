import os
from dotenv import load_dotenv


load_dotenv()


BASE_URL = os.getenv(
    "BASE_URL",
    "http://localhost:3000"
)

API_URL = os.getenv(
    "API_URL",
    "http://localhost:5000/api"
)

BROWSER = os.getenv(
    "BROWSER",
    "chrome"
)