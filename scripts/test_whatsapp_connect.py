from playwright.sync_api import sync_playwright
import os
import time


def test_whatsapp_connect():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Headless=False to see the browser
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:5173")
        page.wait_for_load_state("networkidle")

        # Login
        email = os.getenv("ACCOUNT_TEST_EMAIL", "test@example.com")
        password = os.getenv("ACCOUNT_TEST_EMAIL_PASSWORD", "password")

        page.fill("#email", email)
        page.fill("#password", password)
        page.click("button[type=submit]")
        page.wait_for_load_state("networkidle")

        # Navigate to WhatsApp settings
        # Assuming the menu structure: Settings > WhatsApp Admin > WhatsApp > Connection
        page.click("text=Settings")  # Adjust selector based on actual UI
        page.wait_for_load_state("networkidle")

        # This might need adjustment based on actual menu structure
        page.click("text=WhatsApp Admin")
        page.wait_for_load_state("networkidle")

        page.click("text=WhatsApp")
        page.wait_for_load_state("networkidle")

        page.click("text=Connection")
        page.wait_for_load_state("networkidle")

        # Click Connect button
        page.click("text=Connect")
        page.wait_for_load_state("networkidle")

        # Wait a bit for QR code to load
        time.sleep(3)

        # Check for QR code or error
        qr_selector = (
            "canvas"  # Assuming QRCodeSVG renders as canvas, or check for img/svg
        )
        error_selector = "text=Failed to load QR code"

        if page.locator(error_selector).is_visible():
            print("ERROR: QR code failed to load")
            page.screenshot(path="/tmp/whatsapp_error.png")
        elif page.locator(qr_selector).is_visible():
            print("SUCCESS: QR code displayed")
            page.screenshot(path="/tmp/whatsapp_success.png")
        else:
            print("UNKNOWN: Neither QR code nor error visible")
            page.screenshot(path="/tmp/whatsapp_unknown.png")

        browser.close()


if __name__ == "__main__":
    test_whatsapp_connect()
