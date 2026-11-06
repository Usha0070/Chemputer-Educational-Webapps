// Sitemap <lastmod> dates. A simulation page changes when its MDX or its src/sims/<slug>/ code changes (last git
// commit touching them). Without that history it falls back to the `added` date: no git, or a shallow clone
// (Vercel, CI) where a file untouched in the fetched commits only shows the cut-off commit, which is not its date.
// Chapter pages take their newest simulation (or the curriculum file); home, /ssc/ and /sims/ the newest of all.
// No date is ever later than today.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const SIMS = 'src/content/sims';
const CURRICULUM = 'src/content/curriculum/ssc.yaml';

const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** Commits where a shallow clone's history is cut off (their "changes" are really the whole tree). */
function shallowRoots() {
  try {
    const file = git(['rev-parse', '--git-path', 'shallow']);
    return new Set(existsSync(file) ? readFileSync(file, 'utf8').split(/\s+/).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}
const CUT = shallowRoots();

function gitDate(paths) {
  try {
    const [hash, date] = git(['log', '-1', '--format=%H %cI', '--', ...paths]).split(' ');
    return hash && date && !CUT.has(hash) ? new Date(date) : null;
  } catch {
    return null;
  }
}
const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

/** @returns {(pathname: string) => string | undefined} ISO date for a page path */
export function lastmodResolver() {
  const today = new Date();
  const clamp = (d) => (d > today ? today : d);
  const byPath = new Map();
  const byChapter = new Map();
  let newest = null;

  for (const file of readdirSync(SIMS).filter((f) => f.endsWith('.mdx'))) {
    const slug = file.slice(0, -4);
    const src = readFileSync(`${SIMS}/${file}`, 'utf8');
    const field = (k) => src.match(new RegExp(`^${k}:\\s*['"]?([^'"\\n]+?)['"]?\\s*$`, 'm'))?.[1];
    if ((field('status') ?? 'live') !== 'live') continue;
    const chapter = field('chapter');
    const added = field('added') ? new Date(field('added')) : null;
    const date = clamp(gitDate([`${SIMS}/${file}`, `src/sims/${slug}`]) ?? added ?? today);
    byPath.set(field('path') ?? `/ssc/${chapter}/${slug}/`, date);
    byChapter.set(chapter, later(byChapter.get(chapter), date));
    newest = later(newest, date);
  }
  const curriculum = clamp(gitDate([CURRICULUM]) ?? today);
  for (const [, id] of readFileSync(CURRICULUM, 'utf8').matchAll(/^- id:\s*(\S+)/gm)) {
    byPath.set(`/ssc/${id}/`, later(byChapter.get(id), curriculum));
  }
  newest = later(newest, curriculum);
  for (const p of ['/', '/ssc/', '/sims/']) byPath.set(p, newest);

  return (pathname) => byPath.get(pathname)?.toISOString();
}
