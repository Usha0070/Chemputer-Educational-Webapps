// Site chrome: sidebar (docked + mobile drawer), card carousel, sound toggle and the 3D background.
import { expect, test, type Page } from '@playwright/test';

const desktopOnly = (name: string) => test.skip(name !== 'desktop', 'docked sidebar is a desktop layout');
const mobileOnly = (name: string) => test.skip(name !== 'mobile', 'the drawer is the phone layout');

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

const currentDot = (page: Page) =>
  page
    .locator('[data-carousel]')
    .first()
    .evaluate((c) => [...c.querySelectorAll('.carousel-dot')].findIndex((d) => d.getAttribute('aria-current') === 'true'));

test.describe('sidebar', () => {
  test('docked on desktop, with the current chapter open', async ({ page }, info) => {
    desktopOnly(info.project.name);
    await page.goto('/ssc/05-chemical-bonds/');
    const sidebar = page.locator('#site-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('.sb-chapter')).toHaveCount(12);
    const open = sidebar.locator('.sb-chapter[open]');
    await expect(open).toHaveCount(1);
    await expect(open.locator('summary')).toContainText('রাসায়নিক বন্ধন');
    await expect(open.getByRole('link', { name: 'অধ্যায়ের পাতা' })).toHaveAttribute('aria-current', 'page');
    // Chapter links in the sidebar lead to their pages.
    await sidebar.locator('.sb-chapter').nth(2).locator('summary').click();
    await sidebar.locator('.sb-chapter').nth(2).getByRole('link', { name: 'অধ্যায়ের পাতা' }).click();
    await expect(page).toHaveURL(/\/ssc\/03-structure-of-matter\/$/);
  });

  test('collapses to a rail and remembers it', async ({ page }, info) => {
    desktopOnly(info.project.name);
    await page.goto('/ssc/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-sidebar', 'open');
    await page.getByRole('button', { name: 'সাইডবার ছোট করো' }).click();
    await expect(html).toHaveAttribute('data-sidebar', 'rail');
    await expect(page.locator('.sb-rail')).toBeVisible();
    await expect(page.locator('.sb-full')).toBeHidden();
    await page.reload();
    await expect(html).toHaveAttribute('data-sidebar', 'rail');
    await page.getByRole('button', { name: 'সাইডবার বড় করো' }).click();
    await expect(html).toHaveAttribute('data-sidebar', 'open');
  });

  test('simulation pages start with the rail', async ({ page }, info) => {
    desktopOnly(info.project.name);
    await page.goto('/ssc/05-chemical-bonds/ionic-bond/');
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'rail');
    await expect(page.locator('.sb-rail [aria-current="page"]')).toHaveCount(1);
  });

  test('phone: the menu button opens a drawer that Esc and the backdrop close', async ({ page }, info) => {
    mobileOnly(info.project.name);
    const errors = watchErrors(page);
    await page.goto('/ssc/05-chemical-bonds/ionic-bond/');
    const drawer = page.locator('#site-sidebar');
    const menu = page.getByRole('button', { name: 'মেনু খোলো' });
    await expect(drawer).toBeHidden();
    await menu.click();
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.getByRole('link', { name: 'আয়নিক বন্ধন' })).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menu).toBeFocused();
    await menu.click();
    await expect(drawer).toBeVisible();
    await page.locator('[data-drawer-backdrop]').click({ position: { x: 360, y: 400 } });
    await expect(drawer).toBeHidden();
    // Links in the drawer navigate.
    await menu.click();
    await drawer.getByRole('link', { name: 'সব সিমুলেশন' }).click();
    await expect(page).toHaveURL(/\/sims\/$/);
    expect(errors).toEqual([]);
  });
});

test.describe('carousel', () => {
  test('new simulations slide by buttons and dots', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-carousel]').first();
    await expect(carousel).toHaveAttribute('data-ready', 'true');
    const track = carousel.locator('[data-carousel-track]');
    await expect(track.locator('[data-sim-card]')).toHaveCount(9);
    const dots = carousel.locator('.carousel-dot');
    expect(await dots.count()).toBeGreaterThan(1);
    // Stop auto-advance so the test controls the slides.
    await carousel.getByRole('button', { name: 'স্বয়ংক্রিয় চলা থামাও' }).click();
    await expect(carousel.locator('[data-carousel-pause]')).toHaveAttribute('aria-pressed', 'true');
    const start = await currentDot(page);
    await carousel.getByRole('button', { name: 'পরের স্লাইড' }).click();
    await expect.poll(() => currentDot(page)).toBe((start + 1) % (await dots.count()));
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(0);
    await dots.first().click();
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeLessThan(5);
    await carousel.getByRole('button', { name: 'আগের স্লাইড' }).click(); // wraps to the last page
    await expect.poll(() => currentDot(page)).toBe((await dots.count()) - 1);
  });

  test('advances on its own', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    const carousel = page.locator('[data-carousel]').first();
    await carousel.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(carousel).toHaveAttribute('data-autoplay', 'on');
    const start = await currentDot(page);
    await expect.poll(() => currentDot(page), { timeout: 12_000 }).not.toBe(start);
  });

  test('no auto-advance and a still background with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const carousel = page.locator('[data-carousel]').first();
    await expect(carousel).toHaveAttribute('data-ready', 'true');
    await expect(carousel).not.toHaveAttribute('data-autoplay', /.*/);
    await expect(carousel.locator('[data-carousel-pause]')).toBeHidden();
    await expect(page.locator('[data-bg3d]')).toHaveAttribute('data-mode', 'static');
  });
});

test.describe('ambience', () => {
  test('3D background starts and is hidden from assistive tech', async ({ page }) => {
    await page.goto('/');
    const bg = page.locator('[data-bg3d]');
    await expect(bg).toHaveAttribute('aria-hidden', 'true');
    await expect(bg).toHaveAttribute('data-live', 'true');
    await expect(bg).toHaveAttribute('data-mode', 'animated');
  });

  test('sound is off by default, turns on and off, and is remembered', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const toggle = page.locator('[data-sound-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-sound', /playing|waiting/);
    expect(await page.evaluate(() => localStorage.getItem('chemputer:sound'))).toBe('on');
    // Next page: shown as on, waiting for the first tap (browsers block sound before that).
    await page.goto('/ssc/');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-sound', 'waiting');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-sound', 'off');
    expect(await page.evaluate(() => localStorage.getItem('chemputer:sound'))).toBe('off');
    expect(errors).toEqual([]);
  });
});
