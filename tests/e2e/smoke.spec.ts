// Smoke tests against the production build: every page loads without console errors,
// every simulation island mounts and its controls respond, and nothing overflows at 375 px.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const dist = path.resolve('dist');

/** Simulation pages found in the build: /ssc/<chapter>/<sim>/ */
function simPaths(): string[] {
  const ssc = path.join(dist, 'ssc');
  if (!existsSync(ssc)) throw new Error('Run `npm run build` before the e2e tests.');
  return readdirSync(ssc, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((chapter) =>
      readdirSync(path.join(ssc, chapter.name), { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(path.join(ssc, chapter.name, d.name, 'index.html')))
        .map((d) => `/ssc/${chapter.name}/${d.name}/`),
    );
}
function chapterPaths(): string[] {
  return readdirSync(path.join(dist, 'ssc'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `/ssc/${d.name}/`);
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(1);
}

const SIMS = simPaths();

test('the build contains the simulations', () => {
  expect(SIMS.length).toBeGreaterThanOrEqual(5);
});

for (const url of ['/', '/ssc/', '/sims/', '/404.html', ...chapterPaths()]) {
  test(`page ${url} loads cleanly`, async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto(url);
    expect(res?.status(), url).toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}

for (const url of SIMS) {
  test(`simulation ${url} mounts and responds`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(url);
    const shell = page.locator('[data-sim-ready="true"]').first();
    await expect(shell).toBeVisible();
    // Island hydrated (Astro removes the `ssr` marker after hydration).
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    // Every page follows the template.
    for (const heading of ['কী দেখলে?', 'নিজে চেষ্টা করো', 'পরীক্ষায় যেভাবে আসে', 'সাধারণ ভুল']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
    await expect(page.getByText(/বই: পৃষ্ঠা/).first()).toBeVisible();
    // Shared controls respond: reset and fullscreen toggle.
    const reset = page.getByRole('button', { name: 'শুরুর অবস্থায় ফেরো' });
    if (await reset.count()) await reset.click();
    const full = page.getByRole('button', { name: 'পূর্ণ পর্দায় দেখো' });
    await full.click();
    await page.getByRole('button', { name: 'পূর্ণ পর্দা বন্ধ করো' }).click();
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}

test.describe('simulation behaviour', () => {
  test('shortcut opens a shared link and steps to the Cr exception', async ({ page }) => {
    await page.goto('/ssc/03-structure-of-matter/electron-configuration-shortcut/?z=24');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await expect(page.getByText('ক্রোমিয়াম', { exact: true })).toBeVisible();
    const next = page.getByRole('button', { name: 'পরের ধাপ' });
    while (await next.isEnabled()) await next.click();
    await expect(page.getByText('ব্যতিক্রম!')).toBeVisible();
  });

  test('calculator reads ?z= and shows the group', async ({ page }) => {
    await page.goto('/ssc/04-periodic-table/electron-configuration-calculator/?z=29');
    await expect(page.getByText('কপার').first()).toBeVisible();
    await expect(page.getByText('১১ নম্বর গ্রুপের')).toBeVisible();
  });

  test('theme toggle switches to light and back', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.locator('[data-theme-toggle]').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('catalogue filters by chapter', async ({ page }) => {
    await page.goto('/sims/');
    const cards = page.locator('[data-sim-list] [data-sim-card]');
    const total = await cards.count();
    await page.locator('[data-filter-chapter="03-structure-of-matter"]').click();
    const visible = page.locator('[data-sim-list] [data-sim-card]:visible');
    expect(await visible.count()).toBeLessThan(total);
    expect(await visible.count()).toBeGreaterThan(0);
  });
});
