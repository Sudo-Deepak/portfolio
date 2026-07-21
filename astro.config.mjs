// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages project site: https://sudo-deepak.github.io/portfolio/
export default defineConfig({
  site: 'https://sudo-deepak.github.io',
  base: '/portfolio',
  trailingSlash: 'ignore',
  integrations: [icon(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
