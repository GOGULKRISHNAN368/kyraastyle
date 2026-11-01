# Kryaa Style admin scaffold

The admin API runs on port `4000`; the Vite development server runs on port `5174`.

## Setup and run

1. Copy `api/.env.example` to `api/.env` and replace each placeholder with your own values. The API requires `MONGODB_URI` and `JWT_SECRET` for authentication.
2. In `backend/admin/api`, run `npm.cmd install`, then `npm.cmd run seed:owner` once to create the first owner (only when no admin exists).
3. Start the API with `npm.cmd run dev` (or `npm.cmd start`).
4. In `backend/admin/ui`, run `npm.cmd install`, then `npm.cmd run dev` and open `http://localhost:5174`. Sign in with the seeded owner account.
5. Open `/ui-kit` after signing in to preview the shared components. It is intentionally omitted from the sidebar.

Set `CORS_ORIGIN` to the exact admin UI origin. The API does not allow wildcard origins. The UI's optional API base setting is `VITE_ADMIN_API_URL`.

Both `.env` files are ignored by the local admin `.gitignore`. Keep real credentials out of `.env.example` and source files.

## Authentication endpoints

- `POST /admin-api/auth/login` signs in with email and password and sets an HTTP-only JWT cookie.
- `POST /admin-api/auth/logout` clears the cookie.
- `GET /admin-api/auth/me` returns the signed-in admin profile.
- `GET /admin-api/health` remains public; other `/admin-api` routes require authentication.

## Product management API

All product and category endpoints require the admin cookie session:

- `GET /admin-api/products` supports `search`, `category`, `section`, `active`, `sort`, `direction`, `page`, and `limit` query parameters.
- `GET /admin-api/products/:id`, `POST /admin-api/products`, and `PUT /admin-api/products/:id` read or write product records.
- `PATCH /admin-api/products/:id/active` toggles visibility. `DELETE /admin-api/products/:id` is a soft delete that sets `isActive` to false.
- `PATCH /admin-api/products/reorder` accepts `{ "items": [{ "id": "...", "position": 0 }] }` for products in one section.
- `POST /admin-api/products/bulk` accepts activate/deactivate or category/section changes.
- `GET /admin-api/products/image-preview` returns a server-built Cloudinary URL. No Cloudinary credentials are returned to the UI.
- `GET /admin-api/settings/product-categories` initializes and returns the stored category list when needed.

The Product model maps directly to the existing `products` collection with `autoIndex: false`; it does not request index changes. The default allowed categories are Kurta Sets, Short Tops, Salwar Suits, Unstitched, and Other.

## Customer leads

The admin API creates the `admin_leads` collection when it connects to MongoDB. Records contain `email`, `phone`, `isVerified`, `verifiedAt`, and timestamps; OTP values are never stored. All lead routes require the admin cookie session:

- `GET /admin-api/leads` lists leads newest first.
- `POST /admin-api/leads` accepts `{ "email": "...", "phone": "..." }` and starts the record unverified.
- `PATCH /admin-api/leads/:id/verified` accepts `{ "isVerified": true }` to mark a contact verified.

The current website backend has no customer login or OTP route. The admin collection and page are ready, but localhost:8000 will not populate it until that login flow is connected to the POST endpoint. The website/backend files remain outside the permitted change area.

## Customer orders

The admin API creates the `admin_orders` collection on connection. Orders can be listed and searched with `GET /admin-api/orders?status=Pending&search=...`, created with `POST /admin-api/orders`, and updated with `PUT /admin-api/orders/:id`. The order page saves status, expected delivery date, tracking ID, and the six delivery milestone dates. `/completed-orders` and `/cancelled-orders` filter the same records by status.

`backend/server.js` currently has no checkout/order route or order model, so existing storefront checkouts do not automatically appear here. Website checkout integration requires wiring the storefront backend to write these order fields; that backend is outside the permitted change area. The admin collection will show orders once records are created through a future integration or an authenticated admin API request.

## Announcements

The API creates `admin_announcements` on database connection. Protected endpoints list announcements with `GET /admin-api/announcements`, add one with `POST /admin-api/announcements` and `{ "text": "..." }`, and remove one with `DELETE /admin-api/announcements/:id`. The admin page displays active records newest first. The customer website has no announcement endpoint in its current backend, so storefront display still needs integration outside `backend/admin/`.

## Customer storefront sync

`backend/server.js` now exposes a public read-only `GET /api/storefront/content` endpoint for active products and dress details, configured categories, active coupons, reels, Instagram post metadata, and announcements. `GET /api/storefront/instagram-posts/:id/image` serves the corresponding admin-uploaded image. The static storefront loads `frontend/storefront-sync.js` and uses this data for its category catalog, home collection tiles, announcement strip, offers, reels, and Instagram imagery. The existing public `/api/products` response and behavior are unchanged.

The API allows the exact `CORS_ORIGIN` from `backend/.env` (falling back to `http://localhost:8000`). Set it to the storefront origin if the customer page is served from a different origin. Leads and orders are private operational records, and the customer site currently has no login/checkout integration to associate them with a shopper.

The reference repository remains unreachable from this environment, so the React/Vite UI stack and login page visual design are not confirmed to match Gridox.

## Admin UI shell

The shell includes the Kryaa Style navigation for Dashboard, Products, Media Library, Reviews, Enquiries, Site Sections, Settings, and Admin Users. Products management is implemented; the other data pages remain placeholders. The layout includes a responsive sidebar, search, notification and profile menus, breadcrumbs, reusable controls, and a private `/ui-kit` route.

Reference-specific typography, colors, icon choices, footer, navigation behavior, and component styling are not verified. The design tokens in `ui/src/styles/tokens.css` are a provisional accessible starting point and should be compared with reference screenshots when available.
