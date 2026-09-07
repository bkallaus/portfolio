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

        # Wait for game to load
        time.sleep(2)

        # Override random to ensure deterministic behavior for the test if needed,
        # but let's just click in the center to place buildings
        page.evaluate("""
            window.testPlace = function(x, z, tier) {
                if (city.isValid(x, z)) {
                    city.place(x, z, tier);
                    spawnVisual(x, z, tier);
                }
            }
        """)

        # Stop automatic game ticks
        page.evaluate("clearInterval(1);") # The interval might be 1, let's just use a more robust way

        # Test: Place 3 buildings of tier 1 next to each other
        page.evaluate("testPlace(4, 4, 1);")
        page.evaluate("testPlace(4, 5, 1);")
        page.evaluate("testPlace(4, 6, 1);")

        # Take a screenshot before merge
        page.screenshot(path="verification_match3_before.png")

        # Trigger resolveMerges on one of them
        page.evaluate("resolveMerges(4, 5);")

        # Wait for animation (duration is 0.5s in gsap)
        time.sleep(1.5)

        # Take a screenshot after merge
        page.screenshot(path="verification_match3_after.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()