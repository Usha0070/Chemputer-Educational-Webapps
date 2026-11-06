// @ts-check
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://chemputer-educational-webapps.vercel.app',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react(), mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
