// Theme toggle: dark (brand default) ↔ light, remembered on this device.
const THEME_COLOR = { dark: '#050101', light: '#fbf6f3' } as const;

function apply(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    apply(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  });
}
