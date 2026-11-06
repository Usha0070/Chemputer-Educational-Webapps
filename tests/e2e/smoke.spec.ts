// Smoke tests against the production build: every page loads without console errors,
// every simulation island mounts and its controls respond, and nothing overflows at 375 px.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const dist = path.resolve('dist');

/** Every page in the build that renders a simulation (marked with data-sim-page). */
function simPaths(): string[] {
  if (!existsSync(dist)) throw new Error('Run `npm run build` before the e2e tests.');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) walk(full);
      else if (d.name === 'index.html' && readFileSync(full, 'utf8').includes('data-sim-page=')) {
        out.push('/' + path.relative(dist, path.dirname(full)).split(path.sep).join('/') + '/');
      }
    }
  };
  walk(dist);
  return out.sort();
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
  // clientWidth, not innerWidth: with mobile emulation the visual viewport grows to fit overflowing content.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(1);
}

const SIMS = simPaths();

test('the build contains the simulations', () => {
  expect(SIMS.length).toBeGreaterThanOrEqual(9);
  expect(SIMS).toContain('/periodic-table/');
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
      await expect(page.locator('article[data-sim-page] > h2', { hasText: heading })).toBeVisible();
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
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await expect(page.getByText('কপার').first()).toBeVisible();
    await expect(page.getByText('১১ নম্বর গ্রুপের')).toBeVisible();
  });

  test('theme toggle switches to light and back', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.locator('[data-theme-toggle]').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('catalogue filters by chapter', async ({ page }) => {
    await page.goto('/sims/');
    await page.waitForLoadState('load');
    const cards = page.locator('[data-sim-list] [data-sim-card]');
    const total = await cards.count();
    await page.locator('[data-filter-chapter="03-structure-of-matter"]').click();
    const visible = page.locator('[data-sim-list] [data-sim-card]:visible');
    expect(await visible.count()).toBeLessThan(total);
    expect(await visible.count()).toBeGreaterThan(0);
  });

  test('build-an-atom reads a shared atom and names the ion', async ({ page }) => {
    await page.goto('/ssc/03-structure-of-matter/build-an-atom/?p=17&n=18&e=18');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await expect(page.getByText('ঋণাত্মক আয়ন (অ্যানায়ন)').first()).toBeVisible();
    await page.getByRole('button', { name: 'ইলেকট্রন কমাও' }).click();
    await expect(page.getByText('নিরপেক্ষ পরমাণু').first()).toBeVisible();
  });

  test('build-an-atom starts with carbon-12 when the link has no atom', async ({ page }) => {
    await page.goto('/ssc/03-structure-of-matter/build-an-atom/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await expect(page.getByText('কার্বন-১২', { exact: false }).first()).toBeVisible();
    expect(new URL(page.url()).searchParams.has('p')).toBe(false);
  });

  test('rutherford counts particles as the clock runs', async ({ page }) => {
    await page.goto('/ssc/03-structure-of-matter/rutherford-scattering/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const straight = page.locator('section[aria-label="ডিটেক্টরের গণনা"] p.font-mono.text-2xl').first();
    await expect(straight).not.toHaveText('০', { timeout: 10_000 });
  });

  test('bohr model emits the red Balmer line for 3 → 2', async ({ page }) => {
    await page.goto('/ssc/03-structure-of-matter/rutherford-vs-bohr/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await page.getByRole('button', { name: 'শক্তিস্তর n = 3-এ নাও' }).click();
    await page.getByRole('button', { name: 'শক্তিস্তর n = 2-এ নাও' }).click();
    await expect(page.getByText(/λ = ৬৫৬ nm/)).toBeVisible();
  });

  test('periodic table search selects an element', async ({ page }) => {
    await page.goto('/periodic-table/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await page.getByLabel('খোঁজো (প্রতীক, নাম বা সংখ্যা)').fill('Hg');
    await page.getByLabel('খোঁজো (প্রতীক, নাম বা সংখ্যা)').press('Enter');
    await expect(page.getByRole('heading', { name: 'মার্কারি' })).toBeVisible();
    await expect(page.getByText('[Xe] ', { exact: false }).first()).toBeVisible();
  });

  test('formula writing criss-crosses calcium phosphate', async ({ page }) => {
    await page.goto('/ssc/05-chemical-bonds/formula-writing/?cation=Ca&anion=PO4');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const next = page.getByRole('button', { name: 'পরের ধাপ' });
    while (await next.isEnabled()) await next.click();
    await expect(page.getByLabel('Ca₃(PO₄)₂').last()).toBeVisible();
    await expect(page.getByText('ক্যালসিয়াম ফসফেট').first()).toBeVisible();
  });

  test('ionic bonding transfers two electrons for MgO', async ({ page }) => {
    await page.goto('/ssc/05-chemical-bonds/ionic-bond/?pair=MgO');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const next = page.getByRole('button', { name: 'পরের ধাপ' });
    while (await next.isEnabled()) await next.click();
    await expect(page.getByText(/আয়নিক বন্ধন।/).first()).toBeVisible();
    await expect(page.getByLabel('MgO').last()).toBeVisible();
  });

  test('covalent builder completes N2 with a triple bond', async ({ page }) => {
    await page.goto('/ssc/05-chemical-bonds/covalent-bond/?molecule=N2');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const add = page.getByRole('button', { name: 'একটি যুগল ভাগাভাগি করো' });
    for (let i = 0; i < 3; i++) await add.click();
    await expect(add).toBeDisabled();
    await expect(page.getByText('অণু সম্পূর্ণ!', { exact: false })).toBeVisible();
    await expect(page.getByText('N≡N', { exact: true }).first()).toBeVisible();
  });

  test('equation balancer accepts 4Fe + 3O2 -> 2Fe2O3', async ({ page }) => {
    await page.goto('/ssc/06-mole-concept/equation-balancer/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const plus = page.locator('button[aria-label$="সহগ বাড়াও"]');
    for (let i = 0; i < 3; i++) await plus.nth(0).click();
    for (let i = 0; i < 2; i++) await plus.nth(1).click();
    await plus.nth(2).click();
    await expect(page.getByText('সমতা হয়েছে! তুমি নিজেই করেছ।')).toBeVisible();
  });

  test('mole calculator: 18 g of water is one mole', async ({ page }) => {
    await page.goto('/ssc/06-mole-concept/mole-calculator/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const results = page.locator('section[aria-label="ফলাফল"]');
    await expect(results).toContainText('১ mol');
    await expect(results).toContainText('৬.০২২ × ১০২৩');
  });

  test('empirical formula solver reaches glucose', async ({ page }) => {
    await page.goto('/ssc/06-mole-concept/empirical-formula/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const next = page.getByRole('button', { name: 'পরের ধাপ' });
    while (await next.count()) await next.click();
    await expect(page.getByLabel('CH₂O').first()).toBeVisible();
    await expect(page.getByLabel('C₆H₁₂O₆').first()).toBeVisible();
  });

  test('reaction rate produces products as the clock runs', async ({ page }) => {
    await page.goto('/ssc/07-chemical-reactions/reaction-rate/?');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await expect(page.locator('section[aria-label="উৎপাদ বনাম সময়"] p.font-mono').first()).not.toHaveText('০', { timeout: 15_000 });
  });

  test('redox names the agents and the calculator finds Cr = +6', async ({ page }) => {
    await page.goto('/ssc/07-chemical-reactions/redox/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const next = page.getByRole('button', { name: 'পরের ধাপ' });
    while (await next.isEnabled()) await next.click();
    await expect(page.getByText('বিজারক:')).toBeVisible();
    await page.getByRole('button', { name: 'জারণ সংখ্যা নির্ণয়' }).click();
    await page.locator('input[spellcheck="false"]').fill('K2Cr2O7');
    await expect(page.getByText('Cr = +৬')).toBeVisible();
  });

  test('le chatelier shifts right when N2 is added', async ({ page }) => {
    await page.goto('/ssc/07-chemical-reactions/le-chatelier/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await page.getByRole('button', { name: /N₂ যোগ করো/ }).click();
    await expect(page.getByText(/সাম্যাবস্থা ডানে সরছে/)).toBeVisible();
  });

  test('electrolysis of acidified water gives H2 : O2 = 2 : 1', async ({ page }) => {
    await page.goto('/ssc/08-chemistry-and-energy/electrolysis/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await page.getByRole('button', { name: 'সুইচ চালু করো' }).click();
    await expect(page.getByText('H2 : O2 = ২ : ১')).toBeVisible({ timeout: 10_000 });
  });

  test('galvanic cell reads 1.10 V and drops to zero without the salt bridge', async ({ page }) => {
    await page.goto('/ssc/08-chemistry-and-energy/galvanic-cell/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    const svg = page.locator('section[aria-label="কোষ"] svg');
    await expect(svg).toContainText('1.10');
    await page.getByRole('button', { name: /লবণ সেতু/ }).click();
    await expect(svg).toContainText('0.00');
  });

  test('dissolving NaOH warms the water', async ({ page }) => {
    await page.goto('/ssc/08-chemistry-and-energy/exo-endothermic/');
    await expect(page.locator('[data-sim-ready="true"]')).toBeVisible();
    await page.getByRole('button', { name: 'যোগ করো ও নাড়ো' }).click();
    await expect(page.getByText(/তাপোৎপাদী: বিক্রিয়া তাপ ছেড়ে দেয়/)).toBeVisible();
    await expect(page.locator('section[aria-label="হিসাব"]')).toContainText('kJ/mol');
  });
});
