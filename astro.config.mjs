// @ts-check
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { lastmodResolver } from './scripts/lastmod.mjs';

const lastmod = lastmodResolver();

export default defineConfig({
  site: 'https://chemputer-educational-webapps.vercel.app',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    react(),
    mdx(),
    sitemap({
      // share-image templates (only built by `npm run og`) never go in the sitemap
      filter: (page) => !new URL(page).pathname.startsWith('/og-card/'),
      serialize(item) {
        const date = lastmod(new URL(item.url).pathname);
        return date ? { ...item, lastmod: date } : item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
