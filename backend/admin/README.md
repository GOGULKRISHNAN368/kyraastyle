# Kryaa Style admin scaffold

The admin API runs on port `4000`; the Vite development server runs on port `5174`.

## Setup and run

1. Copy `api/.env.example` to `api/.env` and replace each placeholder with your own values. The API requires `MONGODB_URI` and Cloudinary settings for media uploads.
2. In `admin/api`, run `npm.cmd install`.
3. Start the API with `npm.cmd run dev` (or `npm.cmd start`).
4. In `admin/ui`, run `npm.cmd install`, then `npm.cmd run dev` and open `http://localhost:5174`.
5. Open `/ui-kit` to preview the shared components. It is intentionally omitted from the sidebar.

Set `CORS_ORIGIN` to the exact admin UI origin. The API does not allow wildcard origins. The UI's optional API base setting is `VITE_ADMIN_API_URL`.

Both `.env` files are ignored by the local admin `.gitignore`. Keep real credentials out of `.env.example` and source files.

## Admin API access

The admin UI and API currently require no sign-in. Every `/admin-api` feature route is accessible to clients that can reach the API.

## Product management API

- `GET /admin-api/products` supports `search`, `category`, `section`, `active`, `sort`, `direction`, `page`, and `limit` query parameters.
- `GET /admin-api/products/:id`, `POST /admin-api/products`, and `PUT /admin-api/products/:id` read or write product records.
- `PATCH /admin-api/products/:id/active` toggles visibility. `DELETE /admin-api/products/:id` is a soft delete that sets `isActive` to false.
- `PATCH /admin-api/products/reorder` accepts `{ "items": [{ "id": "...", "position": 0 }] }` for products in one section.
- `POST /admin-api/products/bulk` accepts activate/deactivate or category/section changes.
- `GET /admin-api/products/image-preview` returns a server-built Cloudinary URL. No Cloudinary credentials are returned to the UI.
- `GET /admin-api/settings/product-categories` initializes and returns the stored category list when needed.

The Product model maps directly to the existing `products` collection with `autoIndex: false`; it does not request index changes. The default allowed categories are Kurta Sets, Short Tops, Salwar Suits, Unstitched, and Other.

## Customer accounts and leads

The customer storefront now requires a Kyraa account before a shopper can open the bag or add an item. It uses the storefront backend on port `3000`, which stores account records in the shared Atlas `customers` collection. The admin **Customers** page reads those records through `GET /admin-api/customers` and shows name, email, optional phone, account creation, and latest sign-in information. Passwords are salted and hashed in the storefront backend; neither the admin API nor the UI can read them.

Set `CUSTOMER_AUTH_SECRET` in `backend/.env` to a long, random value before production. The storefront backend falls back to its Atlas URI only for local compatibility, so setting the dedicated secret is required for production deployments.

`frontend/store/login.html` is the customer registration/sign-in page. `customer-auth.js` redirects unauthenticated shoppers there when they select the bag or an **Add to bag** action. On success, the shopper returns to the original cart or product page.

The existing **Leads** page remains separate for contacts that are manually created through the leads API.

The admin API creates the `admin_leads` collection when it connects to MongoDB. Records contain `email`, `phone`, `isVerified`, `verifiedAt`, and timestamps; OTP values are never stored. All lead routes require the admin cookie session:

- `GET /admin-api/leads` lists leads newest first.
- `POST /admin-api/leads` accepts `{ "email": "...", "phone": "..." }` and starts the record unverified.
- `PATCH /admin-api/leads/:id/verified` accepts `{ "isVerified": true }` to mark a contact verified.

The customer account flow is email-and-password based. It does not claim to send an OTP; an SMS/email verification provider can be added later if you decide to require one.

## Customer orders

The admin API creates the `admin_orders` collection on connection. Orders can be listed and searched with `GET /admin-api/orders?status=Pending&search=...`, created with `POST /admin-api/orders`, and updated with `PUT /admin-api/orders/:id`. The order page saves status, expected delivery date, tracking ID, and the six delivery milestone dates. `/completed-orders` and `/cancelled-orders` filter the same records by status.

`backend/server.js` currently has no checkout/order route or order model, so existing storefront checkouts do not automatically appear here. Website checkout integration requires wiring the storefront backend to write these order fields; that backend is outside the permitted change area. The admin collection will show orders once records are created through a future integration or an authenticated admin API request.

## Announcements

The API creates `admin_announcements` on database connection. Protected endpoints list announcements with `GET /admin-api/announcements`, add one with `POST /admin-api/announcements` and `{ "text": "..." }`, and remove one with `DELETE /admin-api/announcements/:id`. The storefront API exposes active announcements to the customer website.

## Customer storefront sync

`backend/server.js` now exposes a public read-only `GET /api/storefront/content` endpoint for active products and dress details, configured categories, active coupons, reels, Instagram post metadata, and announcements. `GET /api/storefront/instagram-posts/:id/image` serves the corresponding admin-uploaded image. The static storefront loads `frontend/storefront-sync.js` and uses this data for its category catalog, home collection tiles, announcement strip, offers, reels, and Instagram imagery. The existing public `/api/products` response and behavior are unchanged.

The API allows the exact `CORS_ORIGIN` from `backend/.env` (falling back to `http://localhost:8000`). Set it to the storefront origin if the customer page is served from a different origin. Set `window.KYRAA_API_URL` to the public storefront-backend URL when the frontend and backend use different origins. Customer login needs the frontend and the storefront backend to be deployed on the same site/origin (recommended) so its secure session cookie is available to the cart.

The reference repository remains unreachable from this environment, so the React/Vite UI stack and login page visual design are not confirmed to match Gridox.

## Admin UI shell

The shell includes the Kryaa Style navigation for Dashboard, Products, Media Library, Reviews, Enquiries, Site Sections, Settings, and Admin Users. Products management is implemented; the other data pages remain placeholders. The layout includes a responsive sidebar, search, notification and profile menus, breadcrumbs, reusable controls, and a private `/ui-kit` route.

Reference-specific typography, colors, icon choices, footer, navigation behavior, and component styling are not verified. The design tokens in `ui/src/styles/tokens.css` are a provisional accessible starting point and should be compared with reference screenshots when available.
