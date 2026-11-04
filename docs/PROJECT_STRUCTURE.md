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
│   ├── admin/
│   │   ├── api/                # Protected admin API
│   │   └── ui/                 # React admin panel
│   ├── scripts/                # Storefront asset and data maintenance
│   ├── server.js               # Storefront API and static server
│   ├── customerAuth.js
│   ├── seed.js
│   ├── serve.js
│   └── package.json
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

`backend/` contains the storefront API and server, customer authentication, catalog seeding and maintenance scripts, and the admin application under `backend/admin/`.

`backend/admin/api/` contains the protected admin API, and `backend/admin/ui/` contains the React admin panel. Keep both inside `backend/` so the admin application has a single location alongside the storefront backend.

## Static serving

`backend/server.js` resolves the frontend root from the server file location, so it works when started from the repository root or from `backend/`. It serves storefront routes and content, and reads admin Instagram uploads from `backend/admin/api/uploads/`.

The admin UI calls the protected admin API; the storefront server broadcasts updates when admin-managed collections change.

## Local development

From the repository root:

```bash
npm start
```

The default port is `3000`. Use `PORT=4000 npm start` in a POSIX shell or `$env:PORT=4000; npm start` in PowerShell. `npm run dev` starts the same server. The root `npm run serve` command is an optional `npx serve frontend` preview and may download the `serve` CLI if it is not already available.

The storefront backend loads `backend/.env`. The admin API and UI use their own environment files under `backend/admin/api/` and `backend/admin/ui/`. Keep real environment files and API keys out of source control.

The frontend also has a small `frontend/package.json` containing `dev` and `start` scripts. From inside `frontend/`, `npm run dev` delegates to `../backend/server.js`, so the website can be started from its own directory while the static-server implementation remains in `backend/`. The optional root shortcut is `npm run frontend:dev`.

## Important routes

- `/` — champagne-silk welcome screen; it automatically or interactively enters the storefront.
- `/kyraastyle.com/index.html` — captured and customized homepage.
- `/store/category.html` — catalogue with category/edit query parameters, filters, sorting, grid/list view, quick view, wishlist state, and demo localStorage bag behavior.

The homepage customizations link its supported shopping cards to `/store/category.html`. The catalogue links back to the captured homepage. Vercel uses `frontend/` as its static output directory, matching these paths.

## Assets and frontend-only features

High-resolution source/reference photography is kept in `frontend/Real_Imgs/`. The `frontend/image/`, `frontend/images/`, and `frontend/assets/` trees retain the original filenames and captured URL-shaped subdirectories used by the pages. Product and category data in `frontend/store/category-page.js` is hard-coded demonstration data.

Cleanup keeps only the captured resources that belong to a page or its path-sensitive runtime. The homepage Cloudflare email decoder and Google Tag Manager capture remain because `frontend/kyraastyle.com/index.html` references them. The catalogue-side unused decoder and empty capture placeholders were removed.

The welcome transition, homepage sections, responsive styling, animations, catalogue filtering/sorting, hover images, quick view, wishlist toggles, and localStorage bag include frontend demonstrations. The admin app manages shared product and content records through its protected API.

## Known limitations

The captured homepage includes many original-site links for pages not captured in this repository, including profile, search, checkout, policies, store locator, product detail, designer, and original collection routes. They are intentionally preserved as snapshot content rather than replaced with invented pages. External services and the original site’s absolute URLs remain external.
