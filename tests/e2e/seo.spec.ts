// Search and sharing metadata on every built page: title, description, canonical, share image, structured data,
// plus the sitemap, icons and manifest being served.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const dist = path.resolve('dist');
const SITE = 'https://chemputer-educational-webapps.vercel.app';

function pages(): { url: string; html: string }[] {
  const out: { url: string; html: string }[] = [];
  const walk = (dir: string) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) walk(full);
      else if (d.name === 'index.html') {
        const rel = path.relative(dist, path.dirname(full)).split(path.sep).join('/');
        out.push({ url: rel ? `/${rel}/` : '/', html: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(dist);
  return out;
}
const meta = (html: string, attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`))?.[1];
const jsonLd = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const data = JSON.parse(m[1]!);
    return Array.isArray(data) ? data : [data];
  });

const PAGES = pages();

test('every page has a title, description, canonical, share image and valid structured data', () => {
  test.skip(test.info().project.name !== 'desktop', 'file checks run once');
  expect(PAGES.length).toBeGreaterThanOrEqual(45);
  expect(
    PAGES.some((p) => p.url.startsWith('/og-card/')),
    'share-image templates must not be in the build',
  ).toBe(false);
  for (const { url, html } of PAGES) {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
    expect(title, url).toContain('Chemputer Studio');
    expect((meta(html, 'name', 'description') ?? '').length, `${url} description`).toBeGreaterThan(50);
    expect(html, url).toContain(`<link rel="canonical" href="${SITE}${url}">`);
    const image = meta(html, 'property', 'og:image') ?? '';
    expect(image, url).toMatch(new RegExp(`^${SITE}/og/[\\w-]+\\.jpg$`));
    expect(existsSync(path.join(dist, new URL(image).pathname)), `${url} share image ${image}`).toBe(true);
    expect(meta(html, 'name', 'twitter:card'), url).toBe('summary_large_image');
    const types = jsonLd(html).map((d) => d['@type']);
    if (url === '/') expect(types).toEqual(expect.arrayContaining(['WebSite', 'EducationalOrganization']));
    else expect(types, url).toContain('BreadcrumbList');
    if (html.includes('data-sim-page=')) expect(types, url).toContain('LearningResource');
  }
});

test('simulation pages carry an English line and a full learning-resource record', () => {
  test.skip(test.info().project.name !== 'desktop', 'file checks run once');
  const page = PAGES.find((p) => p.url === '/ssc/09-acid-base-balance/titration/')!;
  expect(page.html).toMatch(/<p lang="en"[^>]*>Neutralisation and titration · virtual lab for SSC chemistry/);
  expect(page.html).toMatch(/<title>প্রশমন ও টাইট্রেশন \| Neutralisation and titration virtual lab – Chemputer Studio<\/title>/);
  const lr = jsonLd(page.html).find((d) => d['@type'] === 'LearningResource');
  expect(lr).toMatchObject({
    inLanguage: 'bn',
    isAccessibleForFree: true,
    learningResourceType: 'Virtual lab',
    alternateName: 'Neutralisation and titration',
  });
  expect(new Date(lr.dateCreated).getTime()).toBeLessThanOrEqual(Date.now());
  const crumbs = jsonLd(page.html).find((d) => d['@type'] === 'BreadcrumbList');
  expect(crumbs.itemListElement.at(-1).item).toBe(`${SITE}/ssc/09-acid-base-balance/titration/`);
});

test('sitemap lists every page once, with past dates and nothing hidden', () => {
  test.skip(test.info().project.name !== 'desktop', 'file checks run once');
  const xml = readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8');
  const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)];
  const indexable = PAGES.filter((p) => !p.html.includes('name="robots" content="noindex"')).map((p) => `${SITE}${p.url}`);
  expect(entries.map((e) => e[1]).sort()).toEqual(indexable.sort());
  for (const [, loc, lastmod] of entries) {
    expect(lastmod, loc).toBeTruthy();
    expect(new Date(lastmod!).getTime(), loc).toBeLessThanOrEqual(Date.now());
  }
});

test('icons, manifest and robots are served', async ({ request }) => {
  for (const [url, type] of [
    ['/favicon.ico', 'image'],
    ['/favicon.svg', 'image/svg'],
    ['/icons/icon-48.png', 'image/png'],
    ['/icons/apple-touch-icon.png', 'image/png'],
    ['/icons/icon-512.png', 'image/png'],
    ['/og/home.jpg', 'image/jpeg'],
    ['/site.webmanifest', ''],
    ['/robots.txt', 'text/plain'],
  ] as const) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    if (type) expect(res.headers()['content-type'], url).toContain(type);
  }
  const manifest = await (await request.get('/site.webmanifest')).json();
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});

test('Google Search Console ownership stays verifiable (file and meta tag)', async ({ request }) => {
  const file = await request.get('/google710df23056d5f7f3.html');
  expect(file.status()).toBe(200);
  expect((await file.text()).trim()).toBe('google-site-verification: google710df23056d5f7f3.html');
  const home = await (await request.get('/')).text();
  expect(home).toContain('<meta name="google-site-verification" content="TgflAoBa6zT7IdX0fX_K2mZV3CQ8E8gxlVzcMDQSfT0">');
});
