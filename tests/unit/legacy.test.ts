// Old links must keep working: vercel.json redirects and the GitHub Pages stubs must match the sims' `legacy` fields.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { legacyMap, stubHtml } from '../../scripts/legacy.mjs';

const OLD_PAGES = [
  'electron_configuration_shortcut.html',
  'electron_configue_calculator.html',
  'electron_configue_by_blocks.html',
  'periodic_properties_visualizer.html',
  'periodic_table_mnemonics.html',
];

describe('legacy URLs', () => {
  const map = legacyMap();

  it('covers every page of the old site', () => {
    expect(map.map((m) => m.legacy).sort()).toEqual([...OLD_PAGES].sort());
  });

  it('has a 301 redirect for each in vercel.json (run `npm run legacy` if this fails)', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      redirects: { source: string; destination: string; permanent: boolean }[];
    };
    expect(vercel.redirects).toEqual(map.map(({ legacy, to }) => ({ source: `/${legacy}`, destination: to, statusCode: 301 })));
  });

  it('has an up-to-date GitHub Pages stub for each and for index.html', () => {
    expect(readFileSync('index.html', 'utf8')).toBe(stubHtml('/'));
    for (const { legacy, to } of map) expect(readFileSync(legacy, 'utf8'), legacy).toBe(stubHtml(to));
  });

  it('stubs forward the query string', () => {
    expect(stubHtml('/x/')).toContain('+ location.search + location.hash');
  });
});
