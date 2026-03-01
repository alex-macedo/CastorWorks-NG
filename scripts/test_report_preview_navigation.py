#!/usr/bin/env python3
"""Test Report Preview screen navigation in CastorWorks"""

from playwright.sync_api import sync_playwright
import time


def test_report_preview_navigation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Set to True for headless mode
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"{msg.type}: {msg.text}"))

        print("1. Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173")

        print("2. Waiting for dashboard to load...")
        page.wait_for_load_state("networkidle")
        time.sleep(2)  # Additional wait for React to render

        # Take initial screenshot
        page.screenshot(path="test-results/01-dashboard-initial.png", full_page=True)
        print("   Screenshot saved: test-results/01-dashboard-initial.png")

        print("3. Looking for hamburger menu / sidebar toggle...")
        # Try to find hamburger menu button
        hamburger_selectors = [
            'button[aria-label*="menu" i]',
            'button[aria-label*="sidebar" i]',
            '[data-testid*="menu" i]',
            '[data-testid*="sidebar" i]',
            'button:has-text("☰")',
            'button:has-text("Menu")',
            ".hamburger",
            ".sidebar-toggle",
            'button[class*="menu" i]',
            'button[class*="hamburger" i]',
            'svg[class*="menu" i]',
            'svg[class*="hamburger" i]',
        ]

        hamburger_found = False
        for selector in hamburger_selectors:
            try:
                if page.locator(selector).count() > 0:
                    print(f"   Found hamburger menu with selector: {selector}")
                    page.locator(selector).first.click()
                    hamburger_found = True
                    time.sleep(1)
                    break
            except:
                continue

        if not hamburger_found:
            print(
                "   WARNING: Could not find hamburger menu. Taking screenshot to inspect..."
            )
            page.screenshot(
                path="test-results/02-no-hamburger-found.png", full_page=True
            )
            print("   Screenshot saved: test-results/02-no-hamburger-found.png")

        print("4. Looking for 'Progress Reports' under 'Site Vault' section...")
        # Take screenshot of sidebar
        page.screenshot(path="test-results/03-sidebar-open.png", full_page=True)
        print("   Screenshot saved: test-results/03-sidebar-open.png")

        # Try to find Progress Reports link
        progress_report_selectors = [
            "text=Progress Reports",
            'a:has-text("Progress Reports")',
            'button:has-text("Progress Reports")',
            '[data-testid*="progress" i]',
            '[data-testid*="report" i]',
        ]

        progress_found = False
        for selector in progress_report_selectors:
            try:
                if page.locator(selector).count() > 0:
                    print(f"   Found 'Progress Reports' with selector: {selector}")
                    page.locator(selector).first.click()
                    progress_found = True
                    time.sleep(2)  # Wait for navigation
                    break
            except:
                continue

        if not progress_found:
            print("   WARNING: Could not find 'Progress Reports' link")
            # Try to find Site Vault section first
            site_vault_selectors = [
                "text=Site Vault",
                'button:has-text("Site Vault")',
                'div:has-text("Site Vault")',
            ]
            for selector in site_vault_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        print(
                            f"   Found 'Site Vault' section with selector: {selector}"
                        )
                        page.locator(selector).first.click()
                        time.sleep(1)
                        break
                except:
                    continue

        print("5. Taking screenshot after clicking Progress Reports...")
        page.screenshot(
            path="test-results/04-after-progress-reports.png", full_page=True
        )
        print("   Screenshot saved: test-results/04-after-progress-reports.png")

        # Check current URL and page content
        current_url = page.url
        print(f"\n6. Current URL: {current_url}")

        # Check page title or heading
        try:
            heading = page.locator('h1, h2, [role="heading"]').first.inner_text()
            print(f"   Page heading: {heading}")
        except:
            print("   Could not determine page heading")

        # Check if we're on dashboard or report preview
        if (
            "dashboard" in current_url.lower()
            or page.locator("text=Dashboard").count() > 0
        ):
            print("\n   ⚠️  RESULT: Screen shows DASHBOARD (not Report Preview)")
        elif "report" in current_url.lower() or "progress" in current_url.lower():
            print("\n   ✅ RESULT: Screen shows REPORT PREVIEW or related page")
        else:
            print(f"\n   ❓ RESULT: Unknown screen - URL: {current_url}")

        # Report console errors
        errors = [log for log in console_logs if log.startswith("error:")]
        if errors:
            print(f"\n   ⚠️  Console Errors Found ({len(errors)}):")
            for error in errors[:10]:  # Show first 10 errors
                print(f"      {error}")
        else:
            print("\n   ✅ No console errors detected")

        # Print all console logs for debugging
        if console_logs:
            print(f"\n   All console logs ({len(console_logs)} total):")
            for log in console_logs[:20]:  # Show first 20 logs
                print(f"      {log}")

        browser.close()
        print("\n   Test completed!")


if __name__ == "__main__":
    import os

    os.makedirs("test-results", exist_ok=True)
    test_report_preview_navigation()
