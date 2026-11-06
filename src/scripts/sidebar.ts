// Sidebar behaviour.
// Docked (≥1024 px): the collapse button switches between the full list and the slim rail; remembered per device
// (separately for simulation pages, which start as a rail so the simulation keeps its width).
// Drawer (<1024 px): the header's menu button slides it in; Esc, the backdrop or the close button shut it,
// Tab stays inside while it is open, and focus returns to the menu button.
const root = document.documentElement;
const sidebar = document.getElementById('site-sidebar');
const backdrop = document.querySelector<HTMLElement>('[data-drawer-backdrop]');
const openers = [...document.querySelectorAll<HTMLButtonElement>('[data-drawer-open]')];
const collapse = document.querySelector<HTMLButtonElement>('[data-sidebar-collapse]');
const docked = window.matchMedia('(min-width: 1024px)');
const KEY = root.dataset.page === 'sim' ? 'chemputer:sidebar:sim' : 'chemputer:sidebar';

let lastOpener: HTMLElement | null = null;

function syncCollapse() {
  if (!collapse) return;
  const rail = root.dataset.sidebar === 'rail';
  collapse.setAttribute('aria-expanded', String(!rail));
  collapse.setAttribute('aria-label', rail ? 'সাইডবার বড় করো' : 'সাইডবার ছোট করো');
}

collapse?.addEventListener('click', () => {
  const next = root.dataset.sidebar === 'rail' ? 'open' : 'rail';
  root.dataset.sidebar = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  syncCollapse();
});
syncCollapse();

const focusable = () =>
  sidebar
    ? [...sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary')].filter((el) => el.offsetParent !== null)
    : [];

function setOpen(open: boolean) {
  if (!sidebar || !backdrop) return;
  sidebar.dataset.open = String(open);
  root.dataset.drawer = open ? 'open' : '';
  for (const b of openers) b.setAttribute('aria-expanded', String(open));
  if (open) {
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    backdrop.hidden = false;
    requestAnimationFrame(() => (backdrop.dataset.open = 'true'));
    // Focus the current page's link if it is in the list, else the close button.
    const target =
      sidebar.querySelector<HTMLElement>('.sb-full [aria-current="page"]') ?? sidebar.querySelector<HTMLElement>('[data-drawer-close]');
    window.setTimeout(() => target?.focus(), 50);
  } else {
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
    backdrop.dataset.open = 'false';
    window.setTimeout(() => {
      if (sidebar.dataset.open !== 'true') backdrop.hidden = true;
    }, 300);
    lastOpener?.focus();
    lastOpener = null;
  }
}

for (const b of openers) {
  b.addEventListener('click', () => {
    lastOpener = b;
    setOpen(true);
  });
}
backdrop?.addEventListener('click', () => setOpen(false));
sidebar?.querySelector('[data-drawer-close]')?.addEventListener('click', () => setOpen(false));

document.addEventListener('keydown', (e) => {
  if (sidebar?.dataset.open !== 'true') return;
  if (e.key === 'Escape') {
    e.preventDefault();
    setOpen(false);
  } else if (e.key === 'Tab') {
    const items = focusable();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

// Growing past 1024 px while the drawer is open: dock it instead.
docked.addEventListener('change', (e) => {
  if (e.matches && sidebar?.dataset.open === 'true') {
    lastOpener = null;
    setOpen(false);
  }
});

// Keep the current simulation in view inside a long docked list.
const current = sidebar?.querySelector<HTMLElement>('.sb-sims [aria-current="page"]');
// (Set scrollTop directly: scrollIntoView would also scroll the page.)
if (sidebar && current && docked.matches && current.offsetParent === sidebar) {
  sidebar.scrollTop = Math.max(0, current.offsetTop - sidebar.clientHeight / 2);
}
