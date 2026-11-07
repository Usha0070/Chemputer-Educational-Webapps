// Search and sharing metadata: page titles, share-image keys and schema.org structured data (JSON-LD).
// Titles lead with the Bangla name (what students type), then the English name with the kind of resource
// ("simulation", "virtual lab"…) for English searches, then the brand.
import { bn } from '@/chem/format';
import { chapterUrl, simUrl, type Chapter, type Sim, type SimType } from './content';
import { SITE } from './site';

export const TYPE_EN: Record<SimType, string> = {
  animation: 'animation',
  simulation: 'simulation',
  lab: 'virtual lab',
  solver: 'step by step',
  reference: 'interactive',
};

const abs = (path: string) => new URL(path, SITE.url).href;

/** "ব্যাপন ও নিঃসরণ | Diffusion and effusion simulation" (Base adds " – Chemputer Studio"). */
export function simTitle(sim: Sim): string {
  const d = sim.data;
  const en = d.titleEn;
  const kind = TYPE_EN[d.type];
  // References read best as their own name ("The pH scale and indicators"); calculators already say what they are.
  const redundant = d.type === 'reference' || new RegExp(`\\b(${kind}|calculator)\\b`, 'i').test(en);
  const base = `${d.title} | ${en}`;
  // long names skip the kind word, so the English name is not cut off in results
  return redundant || base.length > 55 ? base : `${base} ${kind}`;
}

/** One English line shown under a simulation's title: real text that English searches can match. */
export function simTagline(sim: Sim, chapter: Chapter): string {
  const kind = TYPE_EN[sim.data.type];
  const label = kind === 'step by step' ? 'step-by-step solver' : kind === 'interactive' ? 'interactive reference' : kind;
  return `${sim.data.titleEn} · ${label} for SSC chemistry (Class 9–10), Chapter ${chapter.data.number}: ${chapter.data.titleEn}`;
}

/** Share-image file name (public/og/<key>.jpg), made by `npm run og`. */
export const ogKey = {
  home: 'home',
  ssc: 'ssc',
  sims: 'sims',
  chapter: (c: Chapter) => `chapter-${c.id}`,
  sim: (s: Sim) => s.id,
};
export const ogImageUrl = (key: string): string => abs(`/og/${key}.jpg`);

// ── JSON-LD ────────────────────────────────────────────────────────────────
const ORG_ID = abs('/#organization');
const PERSON_ID = abs('/#author');

export function siteGraph(): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': abs('/#website'),
      name: SITE.brand,
      alternateName: SITE.alternateNames,
      url: abs('/'),
      inLanguage: 'bn',
      description: SITE.description,
      publisher: { '@id': ORG_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      '@id': ORG_ID,
      name: SITE.brand,
      alternateName: SITE.alternateNames,
      url: abs('/'),
      logo: abs('/icons/icon-512.png'),
      slogan: SITE.tagline,
      sameAs: [SITE.youtube],
      founder: { '@id': PERSON_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': PERSON_ID,
      name: SITE.authorEn,
      alternateName: SITE.author,
      sameAs: [SITE.facebook, SITE.youtube],
    },
  ];
}

export function breadcrumbGraph(items: { label: string; href?: string }[], currentPath: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: abs(item.href ?? currentPath),
    })),
  };
}

const LEVEL = 'SSC (Class 9–10, NCTB)';
const RESOURCE_TYPE: Record<SimType, string> = {
  animation: 'Animation',
  simulation: 'Simulation',
  lab: 'Virtual lab',
  solver: 'Step-by-step solver',
  reference: 'Interactive reference',
};
/** Dates written ahead of time in content never go out as future dates. */
const notAfterToday = (d: Date) => new Date(Math.min(d.getTime(), Date.now())).toISOString().slice(0, 10);

export function simGraph(sim: Sim, chapter: Chapter): object {
  const d = sim.data;
  const topics = chapter.data.topics.filter((t) => d.topics.includes(t.id));
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: d.title,
    alternateName: d.titleEn,
    description: d.description,
    url: abs(simUrl(sim)),
    image: ogImageUrl(ogKey.sim(sim)),
    inLanguage: 'bn',
    learningResourceType: RESOURCE_TYPE[d.type],
    interactivityType: d.type === 'reference' ? 'mixed' : 'active',
    educationalLevel: LEVEL,
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    isAccessibleForFree: true,
    teaches: topics.map((t) => `${t.titleBn} (${t.titleEn})`),
    about: { '@type': 'Thing', name: `${chapter.data.titleBn} (${chapter.data.titleEn})` },
    educationalAlignment: [
      { '@type': 'AlignmentObject', alignmentType: 'educationalSubject', targetName: 'Chemistry' },
      { '@type': 'AlignmentObject', alignmentType: 'educationalLevel', targetName: LEVEL },
    ],
    isPartOf: {
      '@type': 'CollectionPage',
      name: `অধ্যায় ${bn(chapter.data.number)}: ${chapter.data.titleBn}`,
      url: abs(chapterUrl(chapter)),
    },
    dateCreated: notAfterToday(d.added),
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
  };
}

/** A list page (all chapters, a chapter's sims, all sims). */
export function collectionGraph(name: string, path: string, items: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: abs(path),
    inLanguage: 'bn',
    isPartOf: { '@id': abs('/#website') },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: abs(item.url) })),
    },
  };
}
