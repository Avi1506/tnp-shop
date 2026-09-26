# The Novelty Prints (TnP Shop) - AI Handoff & Implementation Guide

**Hello Next AI Agent!** 👋
If you are reading this, you are picking up development for the TnP Shop project. Please read this entire document to understand the project architecture, recent changes, and current objectives before suggesting code modifications.

---

## 1. Project Overview & Tech Stack
- **Framework:** Next.js 16.3.0 (App Router). *Note: Uses Next.js 16 conventions (e.g., middleware is `src/proxy.ts`, not `middleware.ts`).*
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Neon Postgres (Serverless) + Drizzle ORM (`postgres-js` driver).
- **Storage:** Cloudflare R2 (S3-compatible) for user uploads and product images.
- **Payments:** Razorpay
- **Emails:** Resend (SMTP)
- **Customizer Engine:** Fabric.js (used in `src/components/product/CustomizeCanvas.tsx`)

---

## 2. Infrastructure & Zero-Cost Architecture Setup
We have explicitly engineered this app to run at **100% Zero-Cost** while handling high traffic:
1. **Database Connection Pooling:** Configured in `src/db/index.ts`. On Vercel, it uses `NEON_DATABASE_URL` (PgBouncer pooled connection) with max 1 connection per serverless function to prevent connection exhaustion. Local development uses `DATABASE_URL`.
2. **Storage:** Configured in `src/lib/storage.ts` and `src/app/api/upload/route.ts`. `STORAGE_DRIVER=r2` is set. Images stream directly to Cloudflare R2 through the Next.js server route, bypassing browser CORS restrictions. Neon DB only stores the resulting public Cloudflare R2 CDN URL.
3. **Caching (ISR):** Catalog pages (`page.tsx`, `shop/page.tsx`, `products/[slug]/page.tsx`) use `export const revalidate = 3600` (or similar) to pre-render at the Vercel Edge. Zero database reads occur for standard visitor traffic.

### Required Environment Variables (`.env.local`)
```env
DATABASE_URL=postgresql://<user>:<pass>@<host>/neondb?sslmode=require
NEON_DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.../neondb?sslmode=require
AUTH_SECRET=<64-char-hex>
NEXTAUTH_URL=https://thenoveltyprints.com

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

EMAIL_FROM="The Novelty Prints <thenoveltyprints@gmail.com>"
ADMIN_EMAIL=thenoveltyprints@gmail.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=

STORAGE_DRIVER=r2
STORAGE_ENDPOINT=https://94812f866ab472d8e7b1fba61e17feb4.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=5e6ba782cd2d75056b304ba09675d85a
STORAGE_SECRET_KEY=98ea3742968d6f7117ae67d254a1c3cdc455979ad38c639da8c5a98fb9615bc2
STORAGE_BUCKET=tnp-uploads
STORAGE_PUBLIC_URL=https://pub-58068b913fb2422c82982c94cf89d0b6.r2.dev
NEXT_PUBLIC_SITE_URL=https://thenoveltyprints.com
```

---

## 3. Recent Changes & Updates (Changelog)
*So you know exactly what was just done:*
- **Cloudflare R2 Direct Integration:** Fixed CORS "Failed to fetch" errors on the Customizer canvas by routing customer photo uploads directly through the `/api/upload` server endpoint.
- **Dual Customization Tracking:** The system now saves BOTH the customer's raw uploaded photo (`uploadedImages`) and the canvas mockup preview (`previewImage`) to R2. Both are visible and downloadable in the Admin Order view.
- **Add to Cart Protection:** Disabled the "Add to Cart" button while a customer photo is uploading to ensure orders aren't submitted with missing images.
- **Cash on Delivery (COD):** Added a global and per-product COD toggle.
- **Email Notifications:** Configured a professional email system using Resend SMTP for order confirmations and admin alerts.

---

## 4. Current Objective (Where to start working)
**Next Task:** Upgrade `CustomizeCanvas.tsx` to match Zazzle's advanced customization flow.
- **The Goal:** Split the Customizer into two distinct views:
  1. A **Flat "Design" View** (Unrolled canvas with exact physical print dimensions and safe/bleed areas).
  2. A **Realistic "Preview" View** (The flat design dynamically wrapped/overlayed onto a realistic blank product mockup).
  3. **Placeholders:** Add "Your Logo Here" placeholder templates that customers can click to swap with their own uploaded images.
- **Current Status:** Waiting for the user to provide high-res blank product images (mockups) and exact physical print dimensions (e.g., 8.5" x 4.1" for a mug wrap).

## Agent Instructions:
1. When you boot up, review this file and `src/components/product/CustomizeCanvas.tsx` to understand the current Fabric.js implementation.
2. The user has given prior authorization to proceed proactively without asking for permission on every single code change ("yes for all my future request").
3. Do not run `npm run dev` as a background serverless daemon unless strictly necessary; prefer writing code, verifying builds with `npm run build`, and committing/pushing.
