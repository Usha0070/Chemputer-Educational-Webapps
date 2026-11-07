// MCQ practice: every chapter MCQ page loads cleanly at both sizes, and a quiz marks answers, explains them,
// scores, remembers the best score and resets.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const dist = path.resolve('dist');
const MCQ_PAGES = readdirSync(path.join(dist, 'ssc'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(dist, 'ssc', d.name, 'mcq', 'index.html')))
  .map((d) => `/ssc/${d.name}/mcq/`);

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.location().url.includes('/_vercel/')) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('every chapter with simulations has an MCQ page', () => {
  expect(MCQ_PAGES.length).toBeGreaterThanOrEqual(10);
});

for (const url of MCQ_PAGES) {
  test(`MCQ page ${url} loads cleanly`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(url);
    await expect(page.locator('h1')).toContainText('MCQ');
    await expect(page.locator('[data-mcq][data-ready="true"]').first()).toBeVisible();
    expect(await page.locator('.mcq-q').count()).toBeGreaterThanOrEqual(5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('a quiz marks, explains, scores, remembers the best score and resets', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/ssc/09-acid-base-balance/titration/');
  const quiz = page.locator('[data-mcq="titration"]');
  await expect(quiz).toHaveAttribute('data-ready', 'true');
  const questions = quiz.locator('.mcq-q');
  await expect(questions).toHaveCount(5);
  const score = quiz.locator('[data-mcq-score]');
  await expect(score).toContainText('স্কোর: ০/৫');

  // First question: pick a wrong option.
  const first = questions.first();
  const answer = Number(await first.getAttribute('data-answer'));
  const wrong = (answer + 1) % 4;
  await first.locator('.mcq-option').nth(wrong).click();
  await expect(first).toHaveAttribute('data-result', 'wrong');
  await expect(first.locator('.mcq-option').nth(wrong)).toHaveAttribute('data-state', 'wrong');
  await expect(first.locator('.mcq-option').nth(answer)).toHaveAttribute('data-state', 'right');
  await expect(first.locator('.mcq-why')).toBeVisible();
  await expect(first.locator('.mcq-why')).toContainText('সঠিক উত্তর');
  // One try only.
  await expect(first.locator('.mcq-option').nth(answer)).toBeDisabled();

  // The rest: answer correctly.
  for (let i = 1; i < 5; i++) {
    const q = questions.nth(i);
    await q
      .locator('.mcq-option')
      .nth(Number(await q.getAttribute('data-answer')))
      .click();
    await expect(q).toHaveAttribute('data-result', 'right');
  }
  await expect(score).toContainText('স্কোর: ৪/৫');
  await expect(score).toContainText('তোমার সেরা: ৪/৫');
  expect(await page.evaluate(() => localStorage.getItem('chemputer:mcq:titration'))).toBe('4');

  // The best score is shared with the chapter MCQ page.
  await page.goto('/ssc/09-acid-base-balance/mcq/');
  await expect(page.locator('[data-mcq="titration"] [data-mcq-score]')).toContainText('তোমার সেরা: ৪/৫');

  // Reset clears the answers but keeps the best score.
  const again = page.locator('[data-mcq="titration"]');
  await again.locator('.mcq-q').first().locator('.mcq-option').first().click();
  await again.getByRole('button', { name: 'আবার চেষ্টা করো' }).click();
  await expect(again.locator('.mcq-q[data-result]')).toHaveCount(0);
  await expect(again.locator('.mcq-why').first()).toBeHidden();
  await expect(again.locator('[data-mcq-score]')).toContainText('স্কোর: ০/৫');
  expect(errors).toEqual([]);
});

test('the chapter hub links to its MCQ page', async ({ page }) => {
  await page.goto('/ssc/05-chemical-bonds/');
  await page
    .getByRole('link', { name: /MCQ অনুশীলন/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/ssc\/05-chemical-bonds\/mcq\/$/);
});
