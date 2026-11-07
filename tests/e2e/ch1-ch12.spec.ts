// Behaviour of the Chapter 1 and Chapter 12 simulations. Locators are scoped to the simulation, because the MCQs below
// it repeat many of the same words.
import { expect, test, type Page } from '@playwright/test';

const sim = (page: Page) => page.locator('[data-sim-ready="true"]');

test('scientific investigation: a fair test shows sugar dissolves faster when hotter; changing two things is flagged', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // trials finish at once
  await page.goto('/ssc/01-concepts-of-chemistry/scientific-investigation/');
  const s = sim(page);
  await expect(s).toBeVisible();
  await s.getByRole('button', { name: 'পানির তাপমাত্রা বাড়লে চিনি দ্রুত গলবে' }).click();
  const temp = s.getByLabel('পানির তাপমাত্রা (যে চলকটি বদলাবে)');
  const run = s.getByRole('button', { name: 'পরীক্ষা চালাও ও সময় লেখো' });
  for (const t of ['20', '40', '60']) {
    await temp.fill(t);
    await run.click();
  }
  await expect(s.locator('tbody tr')).toHaveCount(3);
  await expect(s.getByText('ন্যায্য পরীক্ষা।')).toBeVisible();
  await s.getByRole('button', { name: 'পানি যত গরম, চিনি তত দ্রুত গলে' }).click();
  await expect(s.getByText('ঠিক! তথ্যই এই সিদ্ধান্ত সমর্থন করে।')).toBeVisible();
  await expect(s.getByText('তোমার অনুমানও সঠিক প্রমাণিত হলো।')).toBeVisible();
  // Now stop stirring as well: no longer a fair test.
  await s.getByRole('button', { name: 'নাড়া হবে না' }).click();
  await temp.fill('70');
  await run.click();
  await expect(s.getByText(/ন্যায্য পরীক্ষা নয়!/)).toBeVisible();
});

test('lab safety: sulfuric acid is corrosive, and acid-into-water habits are sorted', async ({ page }) => {
  await page.goto('/ssc/01-concepts-of-chemistry/lab-safety/');
  const s = sim(page);
  await expect(s).toBeVisible();
  await s.getByRole('button', { name: 'বিষাক্ত', exact: true }).click();
  await expect(s.getByText('অল্প পরিমাণ খেলে', { exact: false })).toBeVisible();
  await s.getByRole('button', { name: 'মিলিয়ে দেখো' }).click();
  await expect(s.getByText('গাঢ় সালফিউরিক এসিড')).toBeVisible();
  await s.getByRole('button', { name: 'ক্ষয়কারী', exact: true }).click();
  await expect(s.getByText(/^ঠিক!/)).toBeVisible();
  await s.getByRole('button', { name: 'পরের রাসায়নিক' }).click();
  await expect(s.getByText('কস্টিক সোডা')).toBeVisible();
  await s.getByRole('button', { name: 'নিরাপদ না অনিরাপদ?' }).click();
  const rule = s.locator('li', { hasText: 'এসিড পাতলা করতে এসিডের মধ্যে পানি ঢালা' });
  await rule.getByRole('button', { name: 'অনিরাপদ' }).click();
  await expect(rule.getByText('ঠিক।')).toBeVisible();
});

test('soap: steps reach hard water, 890 g fat gives 918 g soap, very hard water needs 13 drops but detergent one', async ({ page }) => {
  await page.goto('/ssc/12-chemistry-in-our-lives/soap/');
  const s = sim(page);
  await expect(s).toBeVisible();
  const next = s.getByRole('button', { name: 'পরের ধাপ' });
  while (await next.isEnabled()) await next.click();
  await expect(s.getByText('৬. খর পানিতে কী হয়')).toBeVisible();
  await s.getByLabel('চর্বি').fill('890');
  await expect(s.locator('li', { hasText: 'সাবান হবে' })).toContainText('৯১৮ g');
  await s.getByLabel('পানির খরতা (mg/L CaCO₃)').fill('300');
  const drop = s.getByRole('button', { name: 'এক ফোঁটা দাও' });
  for (let i = 0; i < 12; i++) await drop.click();
  await expect(s.getByText(/স্কাম তৈরি করছে/)).toBeVisible();
  await drop.click();
  await expect(s.getByText(/ফেনা হয়েছে! লেগেছে ১৩ ফোঁটা।/)).toBeVisible();
  await s.getByRole('button', { name: 'ডিটারজেন্ট' }).click();
  await drop.click();
  await expect(s.getByText(/ফেনা হয়েছে! লেগেছে ১ ফোঁটা।/)).toBeVisible();
});

test('baking soda: enough vinegar uses all the soda, limewater turns milky; heat alone gives half the gas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ssc/12-chemistry-in-our-lives/baking-soda/');
  const s = sim(page);
  await expect(s).toBeVisible();
  await expect(s.getByText(/এসিড আগে ফুরিয়ে যাবে/)).toBeVisible(); // 60 mL is not enough for 8.4 g
  await s.getByLabel('ভিনেগার (৫% ইথানয়িক এসিড)').fill('120');
  await expect(s.getByText(/এসিড যথেষ্ট/)).toBeVisible();
  await expect(s.locator('li', { hasText: 'CO₂-এর আয়তন' })).toContainText('২.২৪ L');
  await s.getByRole('button', { name: 'ভিনেগার ঢালো' }).click();
  await s.getByRole('button', { name: 'গ্যাস চুনের পানিতে চালাও' }).click();
  await expect(s.getByText(/চুনের পানি ঘোলা হয়ে গেল/)).toBeVisible();
  await s.getByRole('button', { name: 'শুধু তাপ' }).click();
  await expect(s.locator('li', { hasText: 'CO₂-এর আয়তন' })).toContainText('১.১২ L');
  await expect(s.locator('li', { hasText: 'Na₂CO₃ (তেতো)' })).toContainText('৫.৩ g');
});
