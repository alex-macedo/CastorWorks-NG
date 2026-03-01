from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")

    errors = []

    def log_error(msg):
        if "useSidebar must be used within a SidebarProvider" in msg.text:
            errors.append(msg.text)

    page.on("console", log_error)
    page.wait_for_timeout(2000)

    if errors:
        print("Error found:", errors[0])
    else:
        print("No SidebarProvider error detected")

    browser.close()
