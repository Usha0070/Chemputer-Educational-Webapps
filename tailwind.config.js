/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces (darkest → lightest)
        bg: '#0d0d14',
        surface: '#14141d',
        raised: '#1c1c28',
        line: '#2a2a3b',
        // Text
        ink: '#f0eeff',
        muted: '#9a94bf',
        // Brand
        accent: { DEFAULT: '#7c5cfc', 2: '#e05cfc' },
        // Orbital blocks — the same four colours are used by every tool
        block: { s: '#60a5fa', p: '#34d399', d: '#fbbf24', f: '#c084fc' },
        // Exceptions / warnings
        warn: '#fb7185',
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(0)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        pop: 'pop .3s cubic-bezier(.175,.885,.32,1.275) both',
      },
    },
  },
  plugins: [],
};
