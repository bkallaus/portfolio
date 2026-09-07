from playwright.sync_api import sync_playwright
import time

def run():
    print("Launching browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        print("Navigating to page...")
        page.goto("http://localhost:8000/index.html")

        # Wait for game to load and some frames to render
        print("Waiting for animations...")
        time.sleep(5)

        # Take screenshot of the whole viewport
        print("Taking screenshot...")
        page.screenshot(path="verification_obstacles.png")
        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()