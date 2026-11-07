# Chemputer: chemistry made simple

Bangla interactive simulations for SSC chemistry, chapter by chapter, following the NCTB *রসায়ন, নবম–দশম শ্রেণি* book.

- Live site: https://chemputer-educational-webapps.vercel.app
- YouTube: https://www.youtube.com/@ChemputerStudio
- The plan for the whole site (catalogue, architecture, roadmap): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Stack

Astro (static output) · React 19 islands · TypeScript (strict) · Tailwind CSS v4 · MDX content collections validated with Zod ·
Vitest (chemistry engine) · Playwright (smoke test per page and simulation). Fonts are self-hosted with Fontsource
(Hind Siliguri for Bangla, JetBrains Mono for formulas, Orbitron for the CHEMPUTER wordmark).

Vercel builds every push from source (`vercel.json`); nothing generated is committed. Pull requests get a preview URL.

## Working on it

Needs Node.js 22.12 or newer (Vercel and CI use Node 24).

```bash
npm install
npm run dev          # http://localhost:4321 with live reload
```

Before opening a pull request (CI runs the same steps):

```bash
npm run typecheck    # astro check + tsc
npm run lint         # eslint + prettier --check   (npm run format fixes formatting)
npm test             # Vitest: chemistry engine and legacy redirects
npm run build        # static site into dist/
npx playwright install --only-shell chromium   # once
npm run test:e2e     # Playwright smoke tests against the build
```

## Where things live

```
src/
  chem/                  science engine: pure TypeScript + tests (elements, electron configuration, notation, Bangla numbers)
  ui/                    UI kit: SimShell, step player (useSteps), clock (useSimClock), URL state, <Formula>, <Equation>, controls
  sims/<slug>/Sim.tsx    one React component per simulation
  content/
    curriculum/ssc.yaml  chapters, book pages, topics and learning outcomes
    sims/<slug>.mdx      one page per simulation: frontmatter + the explanation sections
    mcq/<slug>.yaml      board-style MCQ practice for that simulation (validated: 4 options, answer, explanation)
  pages/                 routes: /, /ssc/, /ssc/<chapter>/, /ssc/<chapter>/<sim>/, /sims/
  components/, layouts/  site chrome (header, sidebar/drawer, footer, cards, carousel, brand motif)
  scripts/               small page scripts: theme, progress, sidebar, carousel, 3D background (+ worker), ambient sound
  styles/global.css      design tokens (brand colours, chapter hues, chemistry colours, light/dark themes)
  styles/chrome.css      tinted cards, sidebar, carousel, background canvas
scripts/
  new-sim.mjs            scaffold a simulation
  legacy.mjs             regenerate old-URL redirects (vercel.json) and GitHub Pages stubs
  og.mjs                 regenerate share images (public/og/) and icons
  lastmod.mjs            sitemap dates from git history
tests/
  unit/                  Vitest tests outside the engine
  e2e/                   Playwright smoke tests
```

## Adding a simulation

```bash
npm run new:sim -- --chapter 7 --slug reaction-rate --type simulation --title "বিক্রিয়ার হার"
```

1. This creates `src/sims/reaction-rate/Sim.tsx` (a SimShell stub) and `src/content/sims/reaction-rate.mdx` with `status: draft`.
2. Put the chemistry in `src/chem/` with Vitest tests (golden values from the syllabus), and build the interaction with the UI kit.
3. Write the MDX sections: কী দেখলে?, নিজে চেষ্টা করো, পরীক্ষায় যেভাবে আসে, সাধারণ ভুল. Use original wording, never text copied from the book.
4. Set `status: live`. The chapter hub, `/sims/`, the home page, the sitemap and the smoke tests pick it up automatically.
5. Write 5 MCQs in `src/content/mcq/<slug>.yaml` (board style: simple, three-statement "নিচের কোনটি সঠিক?", and
   উদ্দীপক-based; each with a short `why`). They appear under the simulation and on the chapter's MCQ page.
   Put the right option anywhere: ordinary questions are shuffled at build time.
6. Run `npm run og` to make its share image (`public/og/<slug>.jpg`) and commit it. The SEO test fails if a page has none.

The build fails if a simulation names a chapter or topic that is not in the curriculum file.

## Usage statistics

Vercel Web Analytics: cookieless page views, switched on in the Vercel dashboard (Project → Analytics). The script is
added only in Vercel builds (`process.env.VERCEL`), so local and CI builds never request it.

## Search and sharing (SEO)

- **Titles** lead with the Bangla name, then the English name with what it is, then the brand:
  `প্রশমন ও টাইট্রেশন | Neutralisation and titration virtual lab – Chemputer Studio` (`src/lib/seo.ts`).
  Each simulation also shows one English line under its title, so English searches have real text to match.
- **Structured data** (schema.org JSON-LD):
  - home: `WebSite` (with the brand's other spellings), `EducationalOrganization` and `Person`
  - every page: `BreadcrumbList`, from the visible breadcrumbs
  - simulation pages: `LearningResource`
  - list pages: `CollectionPage`
- **Share images**: one 1200×630 JPEG per page in `public/og/`, made by `npm run og`.
  - The script builds the card templates (`src/pages/og-card/`, only with `OG_CARDS=1`) and screenshots them with Playwright's Chromium, which shapes Bangla text correctly.
  - It also makes the PNG icons and `favicon.ico`.
- **Sitemap**: `@astrojs/sitemap`, with each page's `<lastmod>` taken from git history (`scripts/lastmod.mjs`).
- **Search Console / Bing**: paste the verification codes into `SITE.verification` in `src/lib/site.ts`. The meta tags appear only when a code is set.
- **Speed**:
  - The 3D background draws in a Web Worker (OffscreenCanvas), so it costs the page's main thread nothing.
  - Fonts are not preloaded; on a throttled phone a preload made the first paint later.
  - The home headline has a fixed line break on phones, so it doesn't jump when the Bangla font arrives.

## Old links

The first version of the site used flat URLs such as `electron_configue_calculator.html?z=24`. They keep working:

- On Vercel, `vercel.json` has a 301 redirect for each (the query string is kept).
- GitHub Pages still serves the repository root of `main`. The `*.html` files at the root are small redirect stubs that forward
  to the matching page on Vercel, keeping the query string.

Both are generated from the `legacy:` field in each simulation's MDX file: run `npm run legacy` after changing one. A unit test
fails if they drift.
