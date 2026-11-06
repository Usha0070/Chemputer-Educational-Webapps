// Carousel behaviour (markup and styles: src/components/Carousel.astro, src/styles/chrome.css).
// The track is a native scroll-snap row, so swiping works without this script. The script adds:
//  • pages (as many cards as fit), dots, prev/next (wrapping) and ←/→ keys;
//  • auto-advance. The active dot's fill bar is a CSS animation lasting `interval`, and its `animationend`
//    moves to the next page. Pausing the animation therefore pauses the timer exactly where it is.
// Auto-advance holds while the carousel is hovered, keyboard-focused, touched, off-screen or the tab is hidden,
// stops for good with the pause button, and never runs with prefers-reduced-motion.
import { bn } from '@/chem/format';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

export function mountCarousels(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-carousel]:not([data-ready])')) mount(el);
}

function mount(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const dotsBox = root.querySelector<HTMLElement>('[data-carousel-dots]');
  const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const pause = root.querySelector<HTMLButtonElement>('[data-carousel-pause]');
  if (!track || !dotsBox || !prev || !next || !pause) return;
  const slides = [...track.children] as HTMLElement[];
  const interval = Number(root.dataset.interval) || 0;

  let pages: number[] = [];
  let dots: HTMLButtonElement[] = [];
  let current = 0;
  let userPaused = false;
  let settleUntil = 0;
  const holds = new Set<string>();

  slides.forEach((s, i) => {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'স্লাইড');
    s.setAttribute('aria-label', `${bn(i + 1)} / ${bn(slides.length)}`);
  });

  const autoplay = () => interval > 0 && !reduce.matches && pages.length > 1;

  function syncPlay() {
    if (autoplay()) root.dataset.autoplay = 'on';
    else delete root.dataset.autoplay;
    root.dataset.hold = String(userPaused || holds.size > 0);
    track!.setAttribute('aria-live', autoplay() && !userPaused ? 'off' : 'polite');
    pause!.setAttribute('aria-pressed', String(userPaused));
    pause!.setAttribute('aria-label', userPaused ? 'আবার নিজে নিজে চলুক' : 'স্বয়ংক্রিয় চলা থামাও');
    pause!.querySelector<HTMLElement>('[data-icon-pause]')!.hidden = userPaused;
    pause!.querySelector<HTMLElement>('[data-icon-play]')!.hidden = !userPaused;
  }
  const hold = (reason: string, on: boolean) => {
    if (on) holds.add(reason);
    else holds.delete(reason);
    syncPlay();
  };

  function setCurrent(i: number) {
    current = i;
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  }

  function nearest(): number {
    const x = track!.scrollLeft;
    let best = 0;
    pages.forEach((p, i) => {
      if (Math.abs(p - x) < Math.abs(pages[best]! - x)) best = i;
    });
    return best;
  }

  function go(i: number) {
    const n = pages.length;
    if (n === 0) return;
    const target = ((i % n) + n) % n;
    setCurrent(target);
    settleUntil = performance.now() + 900;
    track!.scrollTo({ left: pages[target]!, behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  function measure() {
    const first = slides[0];
    if (!first) return;
    const style = getComputedStyle(track!);
    const inner = track!.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const gap = parseFloat(style.columnGap) || 0;
    const step = first.offsetWidth + gap;
    const perPage = Math.max(1, Math.round((inner + gap) / step));
    const max = track!.scrollWidth - track!.clientWidth;
    const next: number[] = [];
    for (let k = 0; k < slides.length; k += perPage) {
      const left = Math.min(slides[k]!.offsetLeft - first.offsetLeft, max);
      if (next.length === 0 || left - next[next.length - 1]! > 4) next.push(left);
    }
    pages = next;
    root.dataset.single = String(pages.length <= 1);
    dots = pages.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel-dot';
      b.setAttribute('aria-label', `${bn(i + 1)} নম্বর পাতা`);
      b.innerHTML = '<span><span></span></span>';
      b.addEventListener('click', () => go(i));
      return b;
    });
    dotsBox!.replaceChildren(...dots);
    setCurrent(nearest());
    syncPlay();
  }

  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  pause.addEventListener('click', () => {
    userPaused = !userPaused;
    syncPlay();
  });
  dotsBox.addEventListener('animationend', (e) => {
    if (e.animationName === 'dot-fill' && autoplay() && !userPaused && holds.size === 0) go(current + 1);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    go(current + (e.key === 'ArrowRight' ? 1 : -1));
  });

  // Swipes and wheel scrolls: follow the user instead of fighting them.
  let scrollTimer = 0;
  track.addEventListener(
    'scroll',
    () => {
      if (performance.now() < settleUntil) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => setCurrent(nearest()), 90);
    },
    { passive: true },
  );
  track.addEventListener('scrollend', () => {
    settleUntil = 0;
    setCurrent(nearest());
  });

  root.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') hold('hover', true);
  });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') hold('hover', false);
  });
  let touchTimer = 0;
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    window.clearTimeout(touchTimer);
    hold('touch', true);
  });
  const release = () => {
    window.clearTimeout(touchTimer);
    touchTimer = window.setTimeout(() => hold('touch', false), 3000);
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('focusin', (e) => {
    if ((e.target as HTMLElement).matches(':focus-visible')) hold('focus', true);
  });
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget as Node | null)) hold('focus', false);
  });
  new IntersectionObserver(([entry]) => hold('offscreen', !entry?.isIntersecting), { threshold: 0.25 }).observe(root);
  document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));
  reduce.addEventListener('change', syncPlay);

  // Dim the cards that are mostly out of view, so the visible "screen" stands out.
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.target as HTMLElement).dataset.inview = String(e.intersectionRatio >= 0.6);
    },
    { root: track, threshold: [0, 0.6, 1] },
  );
  for (const s of slides) seen.observe(s);

  let raf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(measure);
  }).observe(track);
  measure();
  root.dataset.ready = 'true';
}
