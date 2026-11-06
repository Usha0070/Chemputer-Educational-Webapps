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
    /** Old flat URL (e.g. electron_configue_calculator.html) that redirects here */
    legacy: z.string().optional(),
    added: z.coerce.date(),
    sources: z.array(z.string()).default([]),
    reviewedBy: z.string().optional(),
  }),
});

export const collections = { chapters, sims };
