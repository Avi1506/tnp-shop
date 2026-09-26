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
- **Zazzle Flat Print Strip & 3D Multi-Angle Mockup Overhaul:**
  - **Flat Print Strip Canvas (`7.5 in × 3.5 in`):** Following Zazzle's architecture, the editor is now a true unrolled horizontal wrap strip with green dashed safe-area borders and section guidelines (`Left Side`, `Center Front`, `Right Side`). Rulers indicate `7.5 in Width` and `3.5 in Height`.
  - **Transparent Artwork Extraction:** When taking a preview snapshot, the canvas background is set to transparent and all guidelines/placeholders are hidden. Only the customer's photo and custom text are captured, preventing any nested background images.
  - **Multi-Angle 3D Ceramic Overlay:** In the "Review & Mockup" tab, the customer's transparent design is composited directly onto the blank white ceramic mug with `mix-blend-multiply` at calibrated coordinates across 3 views (`Front View`, `Right Angle (Handle Left)`, `Left Angle (Handle Right)`). Ceramic reflections and gloss blend naturally through the artwork.
  - **Catalog Badges:** Added subtle, dashed "YOUR IMAGE HERE" overlays to customizable product cards in the catalog and product detail pages, along with a "Personalize This Design" action button.
- **Category Print Template System:**
  - Added `print_template` JSONB column to the `categories` database table (`shape`, `widthInches`, `heightInches`, `blankMockupUrl`, `printAreaOnMockup`).
  - Added full Print Template editor in the Admin Categories dashboard (`/admin/categories`) with quick presets:
    - ☕ **Mug:** 7.5" × 3.5" (Wrap Area)
    - 👕 **T-Shirt:** 10" × 12" (Chest Area)
    - ⏰ **Clock / Circle:** 8" × 8" (Circular Print Area)
    - 🛋️ **Cushion / Square:** 12" × 12" (Square Print Area)
    - Plus custom shapes (rectangle, circle, square) and blank mockup file upload to Cloudflare R2.
  - Added 1-click **"Apply Category Template"** helper button in `ProductForm.tsx` so any product automatically inherits its category's print layout, mockup, and dimensions.
- **Zazzle-Style "YOUR IMAGE HERE" Interactive Placeholder:**
  - `CustomizeCanvas.tsx` now renders an interactive "YOUR IMAGE HERE" placeholder graphic inside the printable area when no photo has been uploaded.
  - Clicking or tapping the placeholder on the canvas directly opens the file upload dialog.
  - Uploaded photo automatically replaces the placeholder and scales to fit the exact printable area.
  - Added "Fit Area" and "Fill Area" quick adjustment buttons.
- **Blank Mug Mockups Hosted on R2:**
  - Uploaded 5 high-resolution blank mug mockup photos from the user to Cloudflare R2 (`mockups/mug-front.jpg`, `mug-right.jpg`, `mug-left.jpg`, `mug-handle-left.jpg`, `mug-handle-right.jpg`).
- **Cloudflare R2 Direct Integration:** Fixed CORS "Failed to fetch" errors by routing customer photo uploads directly through the `/api/upload` server endpoint.
- **Dual Customization Tracking:** The system saves BOTH the customer's raw uploaded photo (`uploadedImages`) and the canvas mockup preview (`previewImage`) to R2. Both are visible and downloadable in the Admin Order view.
- **Cash on Delivery (COD) & Email Notifications:** Configured Resend SMTP for automated customer and admin email confirmations.

---

## 4. Current Status & Next Steps
- **Completed:** Authentic Zazzle flat wrap canvas (`7.5" × 3.5"`), pure transparent design extraction, photorealistic 3D ceramic multi-angle preview review, category print template dashboard, and catalog "Personalize" badges.


## Agent Instructions:
1. When you boot up, review this file and `src/components/product/CustomizeCanvas.tsx` to understand the current Fabric.js implementation.
2. The user has given prior authorization to proceed proactively without asking for permission on every single code change ("yes for all my future request").
3. Do not run `npm run dev` as a background serverless daemon unless strictly necessary; prefer writing code, verifying builds with `npm run build`, and committing/pushing.

