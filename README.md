# Deepak Kumar — Portfolio

Personal portfolio of **Deepak Kumar**, Senior Software Developer.
Rebuilt (v2) with **Astro + Tailwind CSS v4** for performance, SEO, and maintainability.

## Tech stack

- **[Astro](https://astro.build)** — static site generation, near-zero client JS
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **astro-icon** + Lucide — SVG icons inlined at build (no runtime icon JS)
- **@astrojs/sitemap** — auto-generated sitemap
- Astro `<Image>` — build-time image optimization (PNG → WebP, responsive `srcset`)

## Project structure

```
public/            # favicons, manifest, resume.pdf (served as-is)
src/
  assets/projects/ # project screenshots (optimized at build)
  components/       # Navbar, Hero, About, Skills, Experience, Projects, ...
  data/site.ts     # all content (edit here to update the site)
  layouts/          # Layout.astro (SEO, theme, meta)
  pages/index.astro
astro.config.mjs   # site + base path config
```

**To update content** (experience, projects, skills, metrics, etc.), edit
`src/data/site.ts` — components read from it.

## Commands

| Command           | Action                                   |
| ----------------- | ---------------------------------------- |
| `npm install`     | Install dependencies                     |
| `npm run dev`     | Start dev server at `localhost:4321`     |
| `npm run build`   | Build production site to `./dist/`       |
| `npm run preview` | Preview the production build locally     |
| `npx astro check` | Type-check `.astro` files                |

## Deployment

Deploys to **GitHub Pages** at `https://sudo-deepak.github.io/portfolio/`
via `.github/workflows/deploy.yml` on every push to `main`.

> One-time setup: in the repo, go to **Settings → Pages → Build and deployment**
> and set **Source** to **GitHub Actions**.

The base path (`/portfolio`) is set in `astro.config.mjs`. If you move to a
user site or custom domain, update `site` and `base` there and the
`start_url`/icon paths in `public/site.webmanifest`.
