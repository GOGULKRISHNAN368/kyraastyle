# Kyraa Style project structure

## Final layout

```text
kyraastyle/
├── frontend/
│   ├── package.json          # Frontend-local dev/start launcher
│   ├── index.html
│   ├── kryaa-opening.css
│   ├── kryaa-opening.js
│   ├── logo.png
│   ├── realistic_flowers.png
│   ├── theloom-live.png
│   ├── theloom-luxe-section.png
│   ├── image/                 # Homepage and catalogue artwork
│   ├── images/                # Editorial, product, video, and category assets
│   ├── assets/                # Captured remote asset paths and source images
│   ├── Real_Imgs/             # High-resolution product/reference photography
│   ├── kyraastyle.com/        # Captured/customized homepage and its _next runtime
│   ├── store/                 # Catalogue page and its separate captured _next runtime
│   └── www.googletagmanager.com/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── admin/                     # Intentionally empty
├── docs/
│   └── PROJECT_STRUCTURE.md
├── .gitignore
├── package.json
├── README.md
└── vercel.json
```

The two captured `_next` directories and the captured third-party resource directories remain separate because the homepage and catalogue snapshots reference different relative roots. Similarly, `image/`, `images/`, `assets/`, and `Real_Imgs/` have not been merged: their existing paths are part of the pages’ asset contract.

## Responsibilities

`frontend/` contains all browser-facing content: the welcome screen, captured homepage, catalogue, CSS, browser JavaScript, fonts, videos, logos, product imagery, editorial imagery, payment icons, and captured static resources. It contains no server code or private environment files.

`backend/` contains only the dependency-free Node development server and its package metadata. There are no routes, controllers, services, models, middleware, database, authentication, checkout, payment, or product API modules because the current application is static-only.

`admin/` must remain a physically empty directory. It has no tracked placeholder file, configuration, or source code.

## Static serving

`backend/server.js` resolves the frontend root from the server file location, so it works when started from the repository root or from `backend/`. It serves only files beneath `frontend/`, supports `GET` and `HEAD`, resolves directory requests to `index.html`, uses an explicit MIME map for the captured file types, rejects traversal/private-path requests, and does not expose `.env`, `.git`, `node_modules`, or backend files.

There is no API and therefore no CORS policy or cross-origin API surface.

## Local development

From the repository root:

```bash
npm start
```

The default port is `3000`. Use `PORT=4000 npm start` in a POSIX shell or `$env:PORT=4000; npm start` in PowerShell. `npm run dev` starts the same server. The root `npm run serve` command is an optional `npx serve frontend` preview and may download the `serve` CLI if it is not already available.

The backend does not load `.env` files automatically; copy values from `backend/.env.example` into the shell environment when needed. Real environment files, Vercel credentials, and API keys must not be committed.

The frontend also has a small `frontend/package.json` containing `dev` and `start` scripts. From inside `frontend/`, `npm run dev` delegates to `../backend/server.js`, so the website can be started from its own directory while the static-server implementation remains in `backend/`. The optional root shortcut is `npm run frontend:dev`.

## Important routes

- `/` — champagne-silk welcome screen; it automatically or interactively enters the storefront.
- `/kyraastyle.com/index.html` — captured and customized homepage.
- `/store/category.html` — catalogue with category/edit query parameters, filters, sorting, grid/list view, quick view, wishlist state, and demo localStorage bag behavior.

The homepage customizations link its supported shopping cards to `/store/category.html`. The catalogue links back to the captured homepage. Vercel uses `frontend/` as its static output directory, matching these paths.

## Assets and frontend-only features

High-resolution source/reference photography is kept in `frontend/Real_Imgs/`. The `frontend/image/`, `frontend/images/`, and `frontend/assets/` trees retain the original filenames and captured URL-shaped subdirectories used by the pages. Product and category data in `frontend/store/category-page.js` is hard-coded demonstration data.

Cleanup keeps only the captured resources that belong to a page or its path-sensitive runtime. The homepage Cloudflare email decoder and Google Tag Manager capture remain because `frontend/kyraastyle.com/index.html` references them. The catalogue-side unused decoder and empty capture placeholders were removed.

The welcome transition, homepage sections, responsive styling, animations, catalogue filtering/sorting, hover images, quick view, wishlist toggles, and localStorage bag are all frontend-only demonstrations. There is no real account system, search backend, inventory, checkout, payment processing, newsletter endpoint, persistence layer, or admin application.

## Known limitations

The captured homepage includes many original-site links for pages not captured in this repository, including profile, search, checkout, policies, store locator, product detail, designer, and original collection routes. They are intentionally preserved as snapshot content rather than replaced with invented pages. External services and the original site’s absolute URLs remain external.
