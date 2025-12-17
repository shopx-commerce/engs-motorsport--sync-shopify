# ENGs Motorsport Shopify Sync

Express + Prisma worker that syncs product records from Postgres to Shopify using the Admin API. It exposes a small HTTP interface for health checks and to kick off a background refresh.

## Endpoints
- `GET /` – simple health check.
- `GET /refresh-shopify` – starts a background batch sync. Returns `429` if another sync is already running.

## How the refresh works
- Reads products from the `products` table in batches of 1000 via Prisma.
- Skips rows with `action_required = null`.
- Optionally skips updates when an existing Shopify product has any tag listed in `SHOPIFY_SKIP_TAGS` (default `skip-product`).
- Builds a Shopify `productSet` mutation payload (`helpers/generateProductSetInput.js`) including options, variants, metafields, tags, accessories, and weights.
- For products marked `delete`, the job sets Shopify status to `DRAFT` instead of fully removing them.
- After each Shopify call, waits 1 second to throttle requests.
- Responses are buffered and flushed every 50 entries to `response-YYYY-MM-DD.jsonl`.
- Clears `action_required` to `null` for each processed batch and continues until all eligible products are handled.

## Requirements
- Node.js 18+ and npm.
- PostgreSQL database reachable via `DATABASE_URL` (and optional `DIRECT_URL` for Prisma).
- Shopify Admin API access token and store domain.

## Environment variables
Create a `.env` file in the project root:
```
DATABASE_URL=postgres://USER:PASS@HOST:PORT/DB
DIRECT_URL=postgres://USER:PASS@HOST:PORT/DB   # optional for Prisma direct access
SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_API_KEY=shpat_xxx                      # Admin API access token
SHOPIFY_SKIP_TAGS=skip-product,another-tag     # optional, comma-separated
```

## Install and run
```
npm install
npx prisma generate
npm start
```
The server listens on port `3000` (see `app.js`).

## Project layout (key files)
- `app.js` – Express server and route wiring.
- `controllers/refreshShopify.js` – batch job controller and main sync loop.
- `helpers/generateProductSetInput.js` – maps DB rows to Shopify `productSet` payloads.
- `helpers/getExistingProductData.js` – fetches existing Shopify product data/tags/variants.
- `helpers/getAccessories.js` – resolves accessory handles to product IDs.
- `helpers/shopifyAdmin.js` – Admin API client using API version `2025-04`.
- `helpers/logger.js` – buffered JSONL logging.
- `prisma/schema.prisma` – Postgres schema (products, product_description, categories).

## Notes
- Concurrency is serialized: only one refresh can run at a time.
- `action_required` values drive behavior: `create`, `update`, `delete`, or `null` (ignore).
- Tags sent to Shopify are prefixed with `filter::` and include a wholesale tag (default `wholesale::18`) plus the shipping class.

