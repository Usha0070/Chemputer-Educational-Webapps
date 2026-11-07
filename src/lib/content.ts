// Content helpers: curriculum + simulation entries, with cross-checks that make a bad link fail the build.
import { getCollection, type CollectionEntry } from 'astro:content';
import { bn } from '@/chem/format';

export type Chapter = CollectionEntry<'chapters'>;
export type Sim = CollectionEntry<'sims'>;
export type SimType = Sim['data']['type'];

export const TYPE_LABEL: Record<SimType, string> = {
  animation: 'অ্যানিমেশন',
  simulation: 'সিমুলেশন',
  lab: 'ভার্চুয়াল ল্যাব',
  solver: 'ধাপে ধাপে সমাধান',
  reference: 'রেফারেন্স',
};

export async function getChapters(): Promise<Chapter[]> {
  const chapters = await getCollection('chapters');
  return chapters.sort((a, b) => a.data.number - b.data.number);
}

let checked: Promise<Sim[]> | undefined;

/** Every live simulation in book order (chapter number, then `order`). Throws if a sim points at a missing chapter or topic. */
export function getSims(): Promise<Sim[]> {
  checked ??= (async () => {
    const [chapters, sims] = await Promise.all([getChapters(), getCollection('sims')]);
    const byId = new Map(chapters.map((c) => [c.id, c]));
    for (const sim of sims) {
      const chapter = byId.get(sim.data.chapter.id);
      if (!chapter) throw new Error(`Simulation "${sim.id}" points at unknown chapter "${sim.data.chapter.id}".`);
      const topicIds = new Set(chapter.data.topics.map((t) => t.id));
      for (const topic of sim.data.topics) {
        if (!topicIds.has(topic))
          throw new Error(`Simulation "${sim.id}" names topic "${topic}", which chapter "${chapter.id}" does not have.`);
      }
    }
    const number = (s: Sim) => byId.get(s.data.chapter.id)!.data.number;
    return sims.filter((s) => s.data.status === 'live').sort((a, b) => number(a) - number(b) || a.data.order - b.data.order);
  })();
  return checked;
}

export const chapterUrl = (c: Chapter): string => `/${c.data.level}/${c.id}/`;
export const simUrl = (s: Sim): string => s.data.path ?? `/ssc/${s.data.chapter.id}/${s.id}/`;

/** The chapter's own hue (a CSS variable defined for both themes in global.css). */
export const chapterHue = (c: Chapter): string => `var(--ch-${c.data.number})`;

export const chapterLabel = (c: Chapter): string => `অধ্যায় ${bn(c.data.number)}`;
export const pagesLabel = ([a, b]: readonly [number, number]): string => (a === b ? `পৃষ্ঠা ${bn(a)}` : `পৃষ্ঠা ${bn(a)}–${bn(b)}`);

export async function getChapterOf(sim: Sim): Promise<Chapter> {
  const chapter = (await getChapters()).find((c) => c.id === sim.data.chapter.id);
  if (!chapter) throw new Error(`Missing chapter for ${sim.id}`);
  return chapter;
}

export function simsIn(chapter: Chapter, sims: Sim[]): Sim[] {
  return sims.filter((s) => s.data.chapter.id === chapter.id);
}

// ── MCQ practice ───────────────────────────────────────────────────────────
export type McqSet = CollectionEntry<'mcq'>;
export type McqQuestion = McqSet['data']['questions'][number];

let mcqChecked: Promise<Map<string, McqQuestion[]>> | undefined;

/** Questions per simulation id. Throws if a question file has no matching simulation (a typo would hide it). */
export function getMcqs(): Promise<Map<string, McqQuestion[]>> {
  mcqChecked ??= (async () => {
    const [sets, sims] = await Promise.all([getCollection('mcq'), getCollection('sims')]);
    const ids = new Set(sims.map((s) => s.id));
    for (const set of sets) {
      if (!ids.has(set.id)) throw new Error(`MCQ file "${set.id}.yaml" has no simulation "${set.id}".`);
    }
    return new Map(sets.map((s) => [s.id, s.data.questions]));
  })();
  return mcqChecked;
}

export const chapterMcqUrl = (c: Chapter): string => `${chapterUrl(c)}mcq/`;
