# The Novelty Prints — Build Progress

## ✅ Everything is now built

All pages from the original spec are implemented and verified with a clean
`npm run build` + `npx tsc --noEmit` (zero errors):

**Customer-facing:** Home, Shop, Product detail, Live customization canvas, Cart,
Checkout + Razorpay (server-verified), Order confirmation, Login/Register/Forgot/Reset
Password, My Account (dashboard, orders, order detail with tracking timeline,
addresses, wishlist, profile/password change), Bulk & Corporate enquiry form,
About, Contact, FAQ, Track Order, Policy pages (shipping/refund/privacy/terms).

**Admin:** Login, Dashboard, Products (list, add, edit, **bulk edit/delete/CSV
import**, per-product customization config editor), Categories (add/edit/delete),
Orders (list + detail with full customization view — uploaded photo, text, final
preview, downloads, status changer that emails the customer).

## Still optional / not built (not in the agreed Phase 1 scope)

- Coupons, Reviews, homepage CMS management, multi-admin roles
- Automated tests
- Full deployment walkthrough was given separately in chat

## Known environment quirk (Windows)

`dotenv-cli` was inconsistent piping env vars into `tsx` on at least one Windows
setup. `db:seed` now uses Node's native `--env-file` flag instead (Node 20.6+),
which is more reliable. `db:generate` / `db:push` still use `dotenv-cli` since
those worked fine.

