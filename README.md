# Kyraa Style

Kyraa Style is a static fashion storefront with a champagne-silk welcome screen, a captured/customized homepage, and a hand-authored category catalogue.

## Project structure

- `frontend/` contains every browser-facing page, script, stylesheet, image, captured Next.js runtime, and source/reference asset.
- `backend/` contains the small Node static development server and its environment template. It does not implement an API, database, authentication, checkout, or payments.
- `admin/` is intentionally empty until an admin application is implemented.
- `docs/PROJECT_STRUCTURE.md` contains the detailed architecture and file audit.

## Run locally

From the repository root:

```bash
npm install
npm start
```

The project has no runtime dependencies, so `npm install` is optional. The server defaults to port `3000`; set `PORT` in the shell if a different port is required. `backend/.env.example` documents the supported settings, but the dependency-free server does not load `.env` files automatically.

Important URLs:

- Welcome screen: <http://localhost:3000/>
- Homepage: <http://localhost:3000/kyraastyle.com/index.html>
- Category catalogue: <http://localhost:3000/store/category.html>

The root `npm run dev` command starts the same development server. `npm run serve` uses `npx serve frontend` as an alternative static preview.

To run the website from inside the frontend directory, use:

```bash
cd frontend
npm run dev
```

This uses the existing dependency-free static server in `backend/server.js`; no server logic is duplicated inside `frontend/`. It serves the frontend at `http://localhost:3000/`. If the backend is already using port 3000, set another port first, for example `PORT=3001 npm run dev` or `$env:PORT=3001; npm.cmd run dev` in PowerShell.

## What is implemented

- Animated welcome screen with automatic and click/keyboard entry.
- Captured Next.js homepage with custom hero, homepage sections, responsive styling, and browser-side customizations.
- Category catalogue with category/edit query parameters, filters, sorting, grid/list layout, hover images, wishlist state, quick view, and a demo localStorage bag.
- Static image, video, font, payment-icon, and captured third-party-resource libraries.

## What is not implemented

The project is static. There is no backend API, database, authentication, product management, payment processing, real checkout, newsletter endpoint, or admin application. The catalogue product data is currently hard-coded in `frontend/store/category-page.js`.

The captured homepage still contains links to pages that are not included in this repository, such as profile, search, checkout, policy, store-locator, and several original collection routes. The custom category links point to the local catalogue at `/store/category.html`.

## Environment and secrets

Backend examples are in `backend/.env.example`. Real environment files and Vercel credentials remain ignored. Do not commit `.env.local`, API keys, tokens, or private credentials.
