import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';

const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const threeSource = readFileSync(createRequire(import.meta.url).resolve('three/build/three.min.js'));

type Hooks = {
  step: (sec: number) => void;
  meeples: { id: number; name: string; co: Generator | null; doing: string; x: number; z: number; elder?: boolean }[];
  buildings: { done: boolean; tileRoof?: boolean }[];
  ground: Uint8Array;
  renderer: { getContext: () => WebGLRenderingContext };
  select: (o: unknown) => void;
  dayT: () => number;
  readonly day: number;
};

declare global {
  interface Window {
    __MEEPLE_FAST?: number;
    __mt: Hooks;
  }
}

async function serveThree(page: Page, body: Buffer | string = threeSource) {
  await page.route(THREE_CDN, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      headers: { 'access-control-allow-origin': '*' },
      body,
    }),
  );
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function open(page: Page, query = '?seed=4242') {
  await page.addInitScript(() => {
    window.__MEEPLE_FAST = 1;
  });
  await serveThree(page);
  await page.goto(`/meepleton/${query}`);
  await page.waitForFunction(() => !!window.__mt);
}

const sign = (page: Page) => page.locator('#sign');
const fallback = (page: Page) => page.locator('#fallback');

test.describe('meepleton boots', () => {
  test('founds a town with four meeples and a sign', async ({ page }) => {
    const errors = collectErrors(page);
    await open(page);

    await expect(sign(page)).toBeVisible();
    await expect(page.locator('#rank')).toHaveText('Camp');
    await expect(page.locator('#clock')).toContainText('Day 1');
    await expect(page.locator('#stats .stat')).toHaveCount(6);
    await expect(page.locator('#logList')).toContainText('founded Meepleton');
    expect(await page.evaluate(() => window.__mt.meeples.length)).toBe(4);
    await expect(fallback(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('loads three.js with a pinned integrity hash', async ({ page }) => {
    await open(page);
    const script = page.locator(`script[src="${THREE_CDN}"]`);
    await expect(script).toHaveAttribute('integrity', /^sha512-/);
    await expect(script).toHaveAttribute('crossorigin', 'anonymous');
  });
});

test.describe('meepleton fallbacks', () => {
  test('explains itself when three.js cannot be downloaded', async ({ page }) => {
    await page.route(THREE_CDN, (route) => route.abort());
    await page.goto('/meepleton/');

    await expect(fallback(page)).toBeVisible();
    await expect(page.locator('#fallbackWhy')).toContainText('could not be downloaded');
    await expect(sign(page)).toBeHidden();
    await expect(page.locator('#log')).toBeHidden();
  });

  test('refuses a tampered copy of three.js', async ({ page }) => {
    await serveThree(page, `${threeSource.toString()}\nwindow.__tampered = true;`);
    await page.goto('/meepleton/');

    await expect(fallback(page)).toBeVisible();
    expect(await page.evaluate(() => 'THREE' in window)).toBe(false);
  });

  test('explains itself when WebGL is switched off', async ({ page }) => {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (kind.includes('webgl')) return null;
        return Reflect.apply(real, this, [kind, ...rest]);
      } as typeof real;
    });
    await serveThree(page);
    await page.goto('/meepleton/');

    await expect(fallback(page)).toBeVisible();
    await expect(page.locator('#fallbackWhy')).toContainText('WebGL');
    await expect(sign(page)).toBeHidden();
  });

  test('falls back instead of throwing when the WebGL renderer cannot start', async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (kind.includes('webgl') && this.id === 'view') return null;
        return Reflect.apply(real, this, [kind, ...rest]);
      } as typeof real;
    });
    await serveThree(page);
    await page.goto('/meepleton/');

    await expect(fallback(page)).toBeVisible();
    await expect(page.locator('#fallbackWhy')).toContainText('could not start');
    expect(errors.filter((e) => !e.startsWith('THREE.'))).toEqual([]);
  });
});

test.describe('meepleton seeds', () => {
  test('a numeric seed becomes the permalink', async ({ page }) => {
    await open(page, '?seed=42');
    const link = page.getByRole('link', { name: 'Island #42' });
    await expect(link).toHaveAttribute('href', '/meepleton/?seed=42');
  });

  test('the same seed grows the same island', async ({ page }) => {
    const terrain = async () => {
      await open(page, '?seed=777');
      return page.evaluate(() => Array.from(window.__mt.ground).join(''));
    };
    const first = await terrain();
    const second = await terrain();
    expect(second).toBe(first);
  });

  test('a word seed is hashed into a stable island number', async ({ page }) => {
    await open(page, '?seed=meeple');
    const text = await page.locator('#seedLink').textContent();
    expect(text).toMatch(/^Island #\d{1,9}$/);
    await open(page, '?seed=meeple');
    await expect(page.locator('#seedLink')).toHaveText(text ?? '');
  });

  test('New island navigates to a fresh numeric seed', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'New island' }).click();
    await expect(page).toHaveURL(/\/meepleton\/\?seed=\d+$/);
    await expect(sign(page)).toBeVisible();
  });
});

test.describe('meepleton controls', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('speed buttons and keys drive the clock', async ({ page }) => {
    const pause = page.getByRole('button', { name: 'Pause' });
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#clock')).toContainText('Paused');

    await pause.evaluate((b) => b.blur());
    await page.keyboard.press('3');
    await expect(page.getByRole('button', { name: '4x' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: '4x' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('help opens with ? and closes with Escape', async ({ page }) => {
    const help = page.locator('#help');
    const button = page.getByRole('button', { name: 'Show controls' });
    await page.keyboard.press('?');
    await expect(help).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('the chronicle folds with its toggle and with C', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Town chronicle' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('c');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('browser shortcuts with a modifier are left to the browser', async ({ page }) => {
    const stolen = await page.evaluate(() =>
      ['c', 'p', 'a', 's', 'd', 'w', 'q', 'e', '=', '-', '1', '?'].filter((key) => {
        const ev = new KeyboardEvent('keydown', { key, ctrlKey: true, cancelable: true, bubbles: true });
        return !document.body.dispatchEvent(ev);
      }),
    );
    expect(stolen).toEqual([]);
    await expect(page.getByRole('button', { name: 'Town chronicle' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#toast')).not.toHaveClass(/on/);
  });

  test('holding P saves one postcard, not a burst', async ({ page }) => {
    const downloads: string[] = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));
    const first = page.waitForEvent('download');
    await page.evaluate(() => {
      dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      for (let k = 0; k < 5; k++) dispatchEvent(new KeyboardEvent('keydown', { key: 'p', repeat: true }));
    });
    const download = await first;
    expect(download.suggestedFilename()).toMatch(/^meepleton-4242-day-\d+\.png$/);
    await page.waitForTimeout(500);
    expect(downloads).toHaveLength(1);
    await expect(page.locator('#toast')).toContainText('Postcard saved');
  });

  test('the chronicle opens its earlier history and folds it back', async ({ page }) => {
    const more = page.getByRole('button', { name: 'Earlier' });
    await more.click();
    await expect(page.locator('#log')).toHaveClass(/more/);
    await expect(page.getByRole('button', { name: 'Recent' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Recent' }).click();
    await expect(page.locator('#log')).not.toHaveClass(/more/);
  });

  test('N visits each meeple in turn and H hides the signs', async ({ page }) => {
    const names = await page.evaluate(() => window.__mt.meeples.map((m) => m.name));
    await page.keyboard.press('n');
    await expect(page.locator('#card')).toContainText(names[0]);
    await page.keyboard.press('n');
    await expect(page.locator('#card')).toContainText(names[1]);
    await page.keyboard.press('Shift+N');
    await expect(page.locator('#card')).toContainText(names[0]);
    await page.keyboard.press('h');
    await expect(sign(page)).toBeHidden();
    await page.keyboard.press('h');
    await expect(sign(page)).toBeVisible();
  });

  test('M shows a minimap that pans the camera when clicked', async ({ page }) => {
    const map = page.locator('#minimap');
    await expect(map).toBeHidden();
    await page.keyboard.press('m');
    await expect(map).toBeVisible();
    await expect(page.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
    await map.click({ position: { x: 10, y: 10 } });
    await page.getByRole('button', { name: 'Map' }).click();
    await expect(map).toBeHidden();
  });

  test('4 runs the island at eight times speed', async ({ page }) => {
    await page.keyboard.press('4');
    await expect(page.getByRole('button', { name: '8x' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('inspecting a meeple opens a card that Escape closes', async ({ page }) => {
    const name = await page.evaluate(() => {
      const m = window.__mt.meeples[0];
      window.__mt.select(m);
      return m.name;
    });
    const card = page.locator('#card');
    await expect(card).toBeVisible();
    await expect(card).toContainText(name);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
  });
});

test.describe('meepleton under stress', () => {
  test('grows through a full year without an error', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = collectErrors(page);
    await open(page);

    for (let day = 0; day < 12; day++) await page.evaluate(() => window.__mt.step(160));

    const town = await page.evaluate(() => ({
      day: window.__mt.day,
      meeples: window.__mt.meeples.length,
      built: window.__mt.buildings.filter((b) => b.done).length,
    }));
    expect(town.day).toBeGreaterThanOrEqual(12);
    expect(town.meeples).toBeGreaterThan(4);
    expect(town.built).toBeGreaterThan(2);
    expect(errors).toEqual([]);
  });

  test('a full town keeps changing: tiled roofs, elders and unique names', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    await open(page);

    for (let day = 0; day < 28; day++) await page.evaluate(() => window.__mt.step(160));

    const town = await page.evaluate(() => ({
      tiled: window.__mt.buildings.filter((b) => b.tileRoof).length,
      elders: window.__mt.meeples.filter((m) => m.elder).length,
      names: new Set(window.__mt.meeples.map((m) => m.name)).size,
      meeples: window.__mt.meeples.length,
    }));
    expect(town.tiled).toBeGreaterThan(0);
    expect(town.elders).toBeGreaterThan(0);
    expect(town.names).toBe(town.meeples);
    await expect(page.locator('#clock')).toContainText('of year 3');
    expect(errors).toEqual([]);
  });

  test('one broken routine does not stall the rest of the town', async ({ page }) => {
    const errors = collectErrors(page);
    await open(page);

    const after = await page.evaluate(() => {
      const [broken, ...rest] = window.__mt.meeples;
      broken.co = (function* () {
        yield;
        throw new Error('routine exploded');
      })();
      broken.co.next();
      const where = () => rest.map((m) => `${m.x.toFixed(2)},${m.z.toFixed(2)}`).join('|');
      const before = { t: window.__mt.dayT(), where: where() };
      window.__mt.step(30);
      window.__mt.step(0.05);
      return {
        recovered: broken.co !== null,
        clockRan: window.__mt.dayT() > before.t,
        othersMoved: where() !== before.where,
      };
    });

    expect(after.recovered).toBe(true);
    expect(after.clockRan).toBe(true);
    expect(after.othersMoved).toBe(true);
    expect(errors.filter((e) => e.includes('routine exploded'))).toHaveLength(1);
  });

  test('survives the GPU taking the canvas away and giving it back', async ({ page }) => {
    const errors = collectErrors(page);
    await open(page);

    await page.evaluate(() => {
      const ext = window.__mt.renderer.getContext().getExtension('WEBGL_lose_context');
      Object.assign(window, { __lose: ext });
      ext?.loseContext();
    });
    await expect(page.locator('#toast')).toContainText('Graphics paused');
    await page.evaluate(() => window.__mt.step(5));

    await page.evaluate(() => {
      (window as unknown as { __lose: WEBGL_lose_context }).__lose.restoreContext();
    });
    await expect(page.locator('#toast')).toContainText('Graphics back');
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});
