from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:5173/quick/")
    page.wait_for_timeout(1000)

    # Scroll the tool into view (use the first instance if only one is found)
    page.evaluate("let els = document.querySelectorAll('#password-generator'); if(els.length > 1) { els[1].scrollIntoView() } else if(els.length === 1) { els[0].scrollIntoView() }")
    page.wait_for_timeout(500)

    # Target the Generate Password button
    generate_btn = page.locator('#password-generator').last.get_by_role("button", name="Generate Password")

    # Generate first password
    generate_btn.click()
    page.wait_for_timeout(500)

    # Generate second password to create history
    generate_btn.click()
    page.wait_for_timeout(500)

    # Find the remove button for the first history item
    remove_buttons = page.locator('#password-generator').last.get_by_role("button", name="Remove password")

    # Click the first remove button
    remove_buttons.nth(0).click()
    page.wait_for_timeout(500)

    # Scroll slightly if needed to show the whole section
    page.evaluate("let els = document.querySelectorAll('#password-generator'); if(els.length > 1) { els[1].scrollIntoView({behavior: 'smooth', block: 'center'}) } else if(els.length === 1) { els[0].scrollIntoView({behavior: 'smooth', block: 'center'}) }")
    page.wait_for_timeout(500)

    # Take a screenshot of the main password generator section
    page.locator('#password-generator').last.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
