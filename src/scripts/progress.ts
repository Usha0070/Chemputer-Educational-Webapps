// Progress without accounts: "দেখা হয়েছে" ticks and "continue where you left off", stored on this device only.
const SEEN = 'chemputer:seen';
const LAST = 'chemputer:last';

interface Last {
  url: string;
  title: string;
  chapter: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

// On a simulation page: remember the visit.
const page = document.body.dataset;
if (page.simUrl && page.simTitle) {
  const seen = new Set(read<string[]>(SEEN, []));
  seen.add(page.simUrl);
  write(SEEN, [...seen]);
  write(LAST, { url: page.simUrl, title: page.simTitle, chapter: page.simChapter ?? '' } satisfies Last);
}

// On any listing: tick the cards already seen.
const seen = new Set(read<string[]>(SEEN, []));
for (const card of document.querySelectorAll<HTMLElement>('[data-sim-card]')) {
  if (seen.has(card.dataset.simCard ?? '')) card.dataset.seen = 'true';
}

// Home page: "continue" card.
const resume = document.querySelector<HTMLElement>('[data-resume]');
const last = read<Last | null>(LAST, null);
if (resume && last?.url?.startsWith('/')) {
  const link = resume.querySelector<HTMLAnchorElement>('a');
  const title = resume.querySelector<HTMLElement>('[data-resume-title]');
  const chapter = resume.querySelector<HTMLElement>('[data-resume-chapter]');
  if (link && title) {
    link.href = last.url;
    title.textContent = last.title;
    if (chapter) chapter.textContent = last.chapter;
    resume.hidden = false;
  }
}
