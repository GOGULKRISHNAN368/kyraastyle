# Kyraa Style

Kyraa Style is a static fashion storefront with a champagne-silk welcome screen, a captured/customized homepage, and a hand-authored category catalogue.

## Project structure

- `frontend/` contains every browser-facing page, script, stylesheet, image, captured Next.js runtime, and source/reference asset.
- `backend/` serves the storefront, public product/content APIs, and customer account sessions. It connects to MongoDB Atlas and serves Cloudinary image URLs.
- `backend/admin/api/` is the product-management API. It uploads images to Cloudinary and stores Cloudinary public IDs, image dimensions, product details, stock, and storefront placement flags in the shared MongoDB database.
- `backend/admin/ui/` is the React admin panel.
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

## Connection setup

Credentials remain outside source control. Copy the example files and fill in only your own values:

1. `backend/.env` — your Atlas URI/database, Cloudinary values, and a long `CUSTOMER_AUTH_SECRET`.
2. `backend/admin/api/.env` — the **same** Atlas URI/database, `CLOUDINARY_URL`, and `CORS_ORIGIN=http://localhost:5174` locally.
3. `backend/admin/ui/.env` — `VITE_ADMIN_API_URL=http://localhost:4000/admin-api` locally.

Run the storefront backend on port `3000`, the admin API on port `4000`, and the admin UI on port `5174`. The admin currently opens without a sign-in step.

When an admin uploads a dress, the flow is:

`Admin UI → protected Admin API → Cloudinary folder → Atlas product/details records → public storefront API → website sections`

The Product form includes a main portrait image recommendation of 1200 × 1600 pixels, gallery uploads, per-size stock (XS–3XL), and New Arrival, Best Seller, Curated Look, and custom Section placement controls. The homepage uses those controls to render the matching collection areas.

## What is not implemented

Online payment processing and final order creation are still not implemented. The cart currently uses browser storage; the customer account gate and account records are implemented, but payment-provider integration remains a separate step.

The captured homepage still contains links to pages that are not included in this repository, such as profile, search, checkout, policy, store-locator, and several original collection routes. The custom category links point to the local catalogue at `/store/category.html`.

## Environment and secrets

Backend examples are in `backend/.env.example`. Real environment files and Vercel credentials remain ignored. Do not commit `.env.local`, API keys, tokens, or private credentials.
