# The Novelty Prints — Owner Playbook

Start every task here. This is a routing map: read the named file and only its direct dependencies before changing code.

## Working agreement

- Operate as the technical owner: find the impact, preserve working behaviour, make the smallest complete fix, verify it, and report evidence and risks plainly.
- Do not scan the whole repository for routine requests. Follow the relevant row below.
- Use a feature branch and pull request for each code change. Keep `main` deployable.
- Never print, commit, or transmit secrets from `.env*`, payment, database, email, or storage configuration.

## Fast routing map

| Owner request | Start here | Direct dependencies when needed |
| --- | --- | --- |
| Homepage, cards, CTA | `src/app/page.tsx`, `src/components/product/ProductCard.tsx` | `src/lib/catalog.ts`, `src/app/globals.css` |
| Shop search, filters, product listing | `src/app/shop/page.tsx` | `src/lib/catalog.ts`, `src/db/schema.ts` |
| Product page, customizer, B2B pricing | `src/app/products/[slug]/page.tsx` | `src/components/product/*`, `src/components/corporate/*` |
| Admin products: price, stock, images, categories | `src/components/admin/ProductForm.tsx` | `src/app/admin/(dashboard)/products/*`, `src/app/api/admin/products/*`, `src/db/schema.ts` |
| Admin categories | `src/app/admin/(dashboard)/categories/page.tsx` | `src/app/api/admin/categories/*`, `src/db/schema.ts` |
| Cart and quantity | `src/components/cart/CartContext.tsx`, `src/app/cart/page.tsx` | `src/components/product/AddToCartPanel.tsx`, `src/app/checkout/page.tsx` |
| Checkout, payment, COD, confirmation | `src/app/checkout/page.tsx` | `src/app/api/checkout/*`, `src/lib/razorpay.ts`, `src/lib/settings.ts`, `src/db/schema.ts` |
| Orders, delivery tracking, order status | `src/app/account/orders/*`, `src/app/track-order/page.tsx` | `src/app/api/track-order/route.ts`, `src/components/admin/OrderStatusChanger.tsx`, `src/db/schema.ts` |
| Corporate/B2B quote funnel | `src/components/corporate/CorporateQuoteDrawer.tsx` | `src/app/api/bulk-enquiry/route.ts`, `src/components/corporate/TieredPricingTable.tsx`, `src/db/schema.ts` |
| Uploads and Cloudflare R2 | `src/lib/storage.ts` | `src/app/api/upload/route.ts`, `src/app/api/upload-url/route.ts` |
| Emails and notifications | `src/lib/email.ts` | sender route under `src/app/api`, `src/lib/settings.ts` |
| Admin dashboard and settings | `src/app/admin/(dashboard)/page.tsx`, `src/app/admin/(dashboard)/settings/page.tsx` | `src/app/api/admin/settings/route.ts`, `src/lib/settings.ts` |
| Customer login and account | `src/lib/auth.ts`, `src/app/login/page.tsx` | `src/app/api/auth/[...nextauth]/route.ts`, `src/db/schema.ts` |
| Design system and mobile accessibility | `src/app/globals.css` | exact affected component/page |
| Analytics | `src/lib/analytics.ts` | exact CTA/component |
| Database table or relationship | `src/db/schema.ts` | `drizzle/`, affected API route, `src/db/seed.ts` |
| Vercel, domains, env variables | Vercel project settings | `.env.example`; never commit `.env*` |

## System map

```text
Customer UI (src/app + src/components)
        ↓
Route handlers (src/app/api)
        ↓
Business services (src/lib) ──→ Email / Razorpay / R2
        ↓
Drizzle schema (src/db/schema.ts) ──→ Neon Postgres
        ↓
Vercel production deployment
```

## Change and test standard

1. Read the map row and exact starting file.
2. Trace only the affected path: UI → API → service → schema.
3. Make the change on a feature branch.
4. Verify according to risk:
   - Copy, CSS, or isolated UI: focused ESLint and browser check.
   - UI behaviour or API logic: focused ESLint, `npm run build`, and safe browser flow.
   - Checkout, payment, orders, login, uploads, email, database: production build plus an end-to-end safe test. Do not charge customers, send communications, or alter real data without explicit owner instruction.
   - Schema changes: inspect the migration, compatibility and rollback path before applying it to Neon.
5. Report changed files, visible result, verification evidence, risks, PR/commit, and production state.

## Quality baseline

- `npm run build` is the release gate.
- Focused ESLint for changed files must pass.
- Full-repository ESLint has existing errors in unrelated account/admin pages; report them as technical debt until resolved.
- Automated tests have not yet been added. Add targeted tests alongside future critical behaviour instead of relying only on manual checks.

## Production facts (no secrets)

- Vercel hosts `tnp-shop`.
- Neon Postgres stores application data.
- Cloudflare R2-compatible S3 storage handles files.
- Razorpay processes payments.
- Production domains: `thenoveltyprints.com` and `www.thenoveltyprints.com`.

For short owner requests such as “admin me price change” or “checkout ka button fix,” use the matching row, inspect that narrow path, then proceed. Ask only when a business rule, copy, price, or irreversible operation is genuinely unclear.
