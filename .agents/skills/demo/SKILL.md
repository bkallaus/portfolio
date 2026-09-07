---
name: demo
description: Record a GIF of a change working in the real browser with Playwright and post it to the pull request as a comment. Use when a PR needs a visual demo, when asked to "show it working" or "demo this", or after finishing a user-visible change.
---

# Demo

A screenshot proves a thing rendered. A GIF proves it *works* — the click lands, the
drawer opens, the number changes. This skill records that loop and puts it on the PR.

**The GIF never enters the repository.** It is not committed, not added to the branch, and
not part of the diff. It lives in a temp directory, gets uploaded, and the PR gets a
comment. A reviewer sees the demo inline; the history stays clean.

## Process

### 1. Serve the app

Two ways to serve, and the change decides which:

- **`npm run dev`** for ordinary in-app UI work. Fast, hot, good enough.
- **`npm run build && npx vite preview --outDir dist --port 4173`** when the change touches
  the shared nav, asset paths, `sites.json`, or `vite.config.ts`. Those things only exist
  after assembly — the dev server will happily show you a demo that is a lie. It is the same
  reason `playwright.config.ts` points at the assembled `dist/` rather than a dev server.

Wait for the URL to answer before recording. A blank first frame is the most common defect.

### 2. Record

Write a throwaway script to the OS temp directory (`$TMPDIR`, falling back to `/tmp`).
**Do not write it into the repo** — not `scripts/`, not `e2e/`. It is scaffolding, not source.

Model it on `scripts/record-walkthrough.mjs`, which already does this for the whole site:
`chromium.launch()`, a context with `recordVideo`, drive the page, close the context to
flush the `.webm`.

```js
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
await page.goto(BASE + '/quick/', { waitUntil: 'networkidle' });
// ... drive the actual feature ...
await context.close();   // required: the video is only written on close
await browser.close();
```

Rules that make a recording watchable:

- **Show the feature, nothing else.** Land on the page where it lives. No tour of the site.
- **Pause between actions** (600–1200ms). Playwright clicks faster than a human reads.
  `await page.waitForTimeout(900)` between steps is not a smell here; it is the point.
- **Ten seconds, hard cap.** If it needs longer, record the one interesting moment instead.
- **Move the mouse before clicking**, so the cursor position explains the click.
- Fail loudly: attach `page.on('pageerror')` and report anything it catches. A GIF of a
  broken feature that *looks* fine is worse than no GIF at all.

### 3. Convert to GIF

`ffmpeg` is required (`brew install ffmpeg`). Two passes — generate a palette, then encode
against it. One pass gives you the default 256-colour palette and visible banding.

```bash
ffmpeg -y -i "$OUT/demo.webm" \
  -vf "fps=12,scale=960:-1:flags=lanczos,palettegen=stats_mode=diff" "$OUT/palette.png"
ffmpeg -y -i "$OUT/demo.webm" -i "$OUT/palette.png" \
  -lavfi "fps=12,scale=960:-1:flags=lanczos,paletteuse=dither=bayer:bayer_scale=3" "$OUT/demo.gif"
```

Then check the size. GitHub rejects images over 10MB, and nobody on a phone waits for 8MB.
**Target under 5MB.** If it is over: drop to `fps=10`, then `scale=800:-1`, then cut seconds.
Do not drop the palette pass to save size — it costs quality and saves little.

### 4. Post it to the PR as a comment

The upload path is the part that matters, because the file must not enter the PR.

**Preferred — release asset.** A release asset hangs off the repository, not off any branch
and not off the PR's file tree, so the diff stays clean and the URL renders inline in a
comment:

```bash
gh release create pr-demos --notes "Demo GIFs linked from PR comments. Not part of any build." || true
gh release upload pr-demos "$OUT/demo-pr123-nav.gif" --clobber
gh pr comment 123 --body '### Nav drawer closes on Escape

![demo](https://github.com/bkallaus/portfolio/releases/download/pr-demos/demo-pr123-nav.gif)'
```

Name each GIF for its PR and feature (`demo-pr123-nav.gif`) so a later run cannot clobber a
GIF an older PR still points at. Be aware of the trade this makes: the asset is public and
lives on the repo indefinitely, it is just not in the diff or on the branch.

**In CI** — Actions cannot create that release without extra permissions, so upload the GIF
with `actions/upload-artifact` and have the comment link to the run's artifact page. It is a
click instead of an inline image; that is the cost of not granting write scope.

Always say what the GIF shows. An unlabelled GIF makes the reviewer guess which part is
the change.

### 5. Clean up

Delete the temp directory, then confirm the working tree is clean — no `.gif`, no `.webm`,
no recording script anywhere in the repo. If something landed, remove it. That is the one
way this skill fails badly.

`/walkthrough`, `/test-results`, and `/playwright-report` are already ignored, so they are
safe scratch space if you would rather keep the artefacts around locally.
