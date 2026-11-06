// npm run og: regenerate the share images (public/og/<key>.jpg, 1200×630) and the PNG/ICO icons (public/icons/,
// public/favicon.ico). Run it after adding or renaming a page, then commit the images.
//
// How: build the site once more with OG_CARDS=1 into dist-og/ (that turns on src/pages/og-card/), serve it locally,
// and screenshot every card with Playwright's Chromium. A real browser shapes Bangla text correctly, which
// SVG-to-image libraries do not.
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve('.');
const outDir = path.join(root, 'dist-og');
const ogDir = path.join(root, 'public', 'og');
const iconDir = path.join(root, 'public', 'icons');

// Run the Astro CLI with node directly (no shell): paths with spaces stay one argument.
const astroCli = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const build = spawnSync(process.execPath, [astroCli, 'build', '--outDir', outDir], {
  stdio: 'inherit',
  env: { ...process.env, OG_CARDS: '1' },
});
if (build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(path.join(outDir, 'og-card'))) throw new Error(`No share-image templates in ${outDir}/og-card`);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};
const server = createServer((req, res) => {
  let file = path.join(outDir, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(outDir) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
try {
  // Share images
  mkdirSync(ogDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const keys = readdirSync(path.join(outDir, 'og-card')).filter((k) => existsSync(path.join(outDir, 'og-card', k, 'index.html')));
  for (const key of keys) {
    await page.goto(`${base}/og-card/${key}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(ogDir, `${key}.jpg`), type: 'jpeg', quality: 85 });
  }
  console.log(`og: ${keys.length} share images → public/og/`);

  // Icons from the SVG favicon
  mkdirSync(iconDir, { recursive: true });
  const svg = readFileSync(path.join(root, 'public', 'favicon.svg'), 'base64');
  const icon = async (size, file, background = 'transparent') => {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(
      `<html><body style="margin:0;background:${background}"><img src="data:image/svg+xml;base64,${svg}" style="display:block;width:${size}px;height:${size}px"></body></html>`,
    );
    const png = await p.screenshot({ path: file, omitBackground: background === 'transparent' });
    await p.close();
    return png;
  };
  const png48 = await icon(48, path.join(iconDir, 'icon-48.png'));
  await icon(192, path.join(iconDir, 'icon-192.png'));
  await icon(512, path.join(iconDir, 'icon-512.png'));
  await icon(180, path.join(iconDir, 'apple-touch-icon.png'), '#ba0000'); // iOS fills transparency with black
  // favicon.ico: a single 48×48 PNG inside an ICO container (supported by every current browser and crawler)
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(1, 4);
  head.writeUInt8(48, 6);
  head.writeUInt8(48, 7);
  head.writeUInt16LE(1, 10);
  head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png48.length, 14);
  head.writeUInt32LE(22, 18);
  writeFileSync(path.join(root, 'public', 'favicon.ico'), Buffer.concat([head, png48]));
  console.log('og: icons → public/icons/, public/favicon.ico');
} finally {
  await browser.close();
  server.close();
  rmSync(outDir, { recursive: true, force: true });
}
