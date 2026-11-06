// Scaffold a new simulation: one component folder + one content file.
//   npm run new:sim -- --chapter 7 --slug reaction-rate [--type simulation] [--title "বিক্রিয়ার হার"]
// Creates src/sims/<slug>/Sim.tsx (SimShell stub) and src/content/sims/<slug>.mdx (status: draft).
// Set `status: live` in the MDX file when the simulation is ready; it then appears everywhere automatically.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    level: { type: 'string', default: 'ssc' },
    chapter: { type: 'string' },
    slug: { type: 'string' },
    type: { type: 'string', default: 'simulation' },
    title: { type: 'string', default: 'নতুন সিমুলেশন' },
  },
});

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
if (!values.chapter || !values.slug) fail('Usage: npm run new:sim -- --chapter <number> --slug <kebab-case-slug> [--type simulation] [--title "…"]');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug)) fail('Slug must be kebab-case, e.g. reaction-rate');
if (!['animation', 'simulation', 'lab', 'solver', 'reference'].includes(values.type)) fail('Unknown --type');

const curriculum = readFileSync(path.join(root, 'src/content/curriculum', `${values.level}.yaml`), 'utf8');
const nn = String(Number(values.chapter)).padStart(2, '0');
const chapterId = curriculum.match(new RegExp(`^- id: (${nn}-[a-z0-9-]+)`, 'm'))?.[1];
if (!chapterId) fail(`No chapter ${values.chapter} in ${values.level}.yaml`);
const block = curriculum.slice(curriculum.indexOf(`- id: ${chapterId}`)).split(/\n- id: /)[0];
const firstTopic = block.match(/\{ id: ([a-z0-9-]+)/)?.[1] ?? 'TODO';

const simDir = path.join(root, 'src/sims', values.slug);
const mdxPath = path.join(root, 'src/content/sims', `${values.slug}.mdx`);
if (existsSync(simDir) || existsSync(mdxPath)) fail(`${values.slug} already exists.`);

const component = values.slug
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join('');

mkdirSync(simDir, { recursive: true });
writeFileSync(
  path.join(simDir, 'Sim.tsx'),
  `// ${values.title}
import { useRef, useState } from 'react';
import { SimShell, useActive, useSimClock } from '@/ui';

export default function ${component}() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const [t, setT] = useState(0);
  const clock = useSimClock((dt) => setT((x) => x + dt), { active, autoplay: false });

  return (
    <SimShell ref={shellRef} label="${values.title}" clock={clock} onReset={() => setT(0)}>
      <div className="panel panel-pad min-h-[240px]">
        <p className="font-mono text-muted">t = {t.toFixed(1)} s</p>
      </div>
    </SimShell>
  );
}
`,
);

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  mdxPath,
  `---
title: '${values.title}'
titleEn: 'TODO English title'
description: 'TODO: এক-দুই বাক্যে লেখো সিমুলেশনে শিক্ষার্থী কী দেখবে ও করবে।'
chapter: ${chapterId}
topics: [${firstTopic}]
type: ${values.type}
status: draft
order: 100
icon: atom
added: ${today}
sources: []
---

import Sim from '@/sims/${values.slug}/Sim';

<Sim client:load />

## কী দেখলে?

## নিজে চেষ্টা করো

1.

## পরীক্ষায় যেভাবে আসে

## সাধারণ ভুল

-
`,
);

console.log(`Created src/sims/${values.slug}/Sim.tsx and src/content/sims/${values.slug}.mdx (chapter ${chapterId}, status: draft).`);
