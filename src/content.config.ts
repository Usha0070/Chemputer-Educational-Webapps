// Content collections, validated with Zod at build time.
// chapters: one entry per book chapter (src/content/curriculum/ssc.yaml)
// sims:     one MDX file per simulation (src/content/sims/<slug>.mdx); the file name is the URL slug.
import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ICONS } from './ui/icons';

const pageRange = z
  .tuple([z.number().int().positive(), z.number().int().positive()])
  .refine(([a, b]) => a <= b, 'pages: first page after last page');

const chapters = defineCollection({
  loader: file('src/content/curriculum/ssc.yaml'),
  schema: z.object({
    level: z.enum(['ssc']),
    number: z.number().int().min(1),
    titleBn: z.string().min(1),
    titleEn: z.string().min(1),
    pages: pageRange,
    summary: z.string().min(1),
    topics: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), titleBn: z.string().min(1), titleEn: z.string().min(1) })).min(1),
    outcomes: z.array(z.string().min(1)).min(1),
  }),
});

export const SIM_TYPES = ['animation', 'simulation', 'lab', 'solver', 'reference'] as const;

const sims = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/sims' }),
  schema: z.object({
    /** Bangla title */
    title: z.string().min(1),
    titleEn: z.string().min(1),
    /** One or two sentences: used on cards and as the meta description */
    description: z.string().min(20),
    chapter: reference('chapters'),
    /** Topic ids from the chapter in the curriculum file (checked at build time) */
    topics: z.array(z.string()).min(1),
    type: z.enum(SIM_TYPES),
    status: z.enum(['live', 'draft']).default('live'),
    /** Position within the chapter (book order) */
    order: z.number(),
    /** Book pages; defaults to the chapter's page range */
    pages: pageRange.optional(),
    icon: z.enum(Object.keys(ICONS) as [keyof typeof ICONS, ...(keyof typeof ICONS)[]]),
    /** Custom site-wide URL instead of /ssc/<chapter>/<slug>/ (e.g. /periodic-table/) */
    path: z
      .string()
      .regex(/^\/[a-z0-9-/]+\/$/)
      .optional(),
    /** Old flat URL (e.g. electron_configue_calculator.html) that redirects here */
    legacy: z.string().optional(),
    added: z.coerce.date(),
    sources: z.array(z.string()).default([]),
    reviewedBy: z.string().optional(),
  }),
});

/** Options for a statement question (i, ii, iii), in the board-exam order. */
export const STATEMENT_OPTIONS = ['i ও ii', 'i ও iii', 'ii ও iii', 'i, ii ও iii'];

/** Stable shuffle of an ordinary question's options (seeded by its text), so the right answer is not always ক. */
function shuffled(options: string[], answer: number, key: string): { options: string[]; answer: number } {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { options: order.map((i) => options[i]!), answer: order.indexOf(answer) };
}

const question = z
  .object({
    /** উদ্দীপক: a short passage the question is about (passage-based MCQ) */
    stem: z.string().min(10).optional(),
    q: z.string().min(5),
    /** three statements for a "নিচের কোনটি সঠিক?" question; options then default to STATEMENT_OPTIONS */
    statements: z.array(z.string().min(2)).length(3).optional(),
    options: z.array(z.string().min(1)).length(4).optional(),
    /** index of the correct option, 0–3 (ক–ঘ) */
    answer: z.number().int().min(0).max(3),
    /** why the answer is right (shown after answering) */
    why: z.string().min(10),
  })
  .refine((x) => x.options || x.statements, 'options are required unless the question has statements')
  .refine((x) => !x.options || new Set(x.options).size === 4, 'the four options must all differ')
  // Statement questions keep the fixed i/ii/iii order; ordinary questions are shuffled (write the right one anywhere).
  .transform((x) =>
    x.statements ? { ...x, options: STATEMENT_OPTIONS } : { ...x, ...shuffled(x.options!, x.answer, `${x.stem ?? ''}${x.q}`) },
  );

// mcq: board-style practice questions for one simulation (src/content/mcq/<sim-slug>.yaml). Original wording.
const mcq = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/mcq' }),
  schema: z.object({ questions: z.array(question).min(3).max(12) }),
});

export const collections = { chapters, sims, mcq };
