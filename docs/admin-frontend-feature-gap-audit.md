# Admin to Frontend Feature Gap Audit

Date: 2026-07-21
Branch: `codex/remaining-integration-plan`

## Integrated

- Products and inventory: admin products feed `/`, `/shop`, `/search`, `/product/[slug]`, cart, checkout, and landing product sections.
- Categories: admin categories feed public category rail and `/shop?category=...`.
- Brands: admin brands feed product cards, product detail metadata, and `/shop?brand=...`.
- Orders: storefront checkout creates backend orders; admin orders updates lifecycle, payment, and delivery status.
- Track order: `/track-order?code=...` now reads backend order status updated from admin orders.
- Payments: checkout and payment callback routes create/update payment records visible in admin payments.
- Coupons: admin coupons are accepted by checkout and backend cart/order totals.
- Store settings: admin settings feed public header/footer, checkout payment availability, delivery charges, and support links.
- Landing pages: admin landing pages render at `/l/[slug]`.
- Landing page sections: `banner`, `carousel`, `title`, `subtitle`, `product_section`, `faq`, `testimonials`, and `cta` now render on the frontend.
- Homepage carousel: `/` now reads the admin-managed `home` landing page carousel section, with static fallback.

## Remaining Gaps

- Customers exist in admin and account/orders exist publicly, but there is no customer-facing profile editor beyond account display.
- Reports are admin-only by design; there is no public frontend equivalent.
- Static content pages (`about-us`, `contact-us`, `faq`, `privacy`, `terms`, `cookie-policy`) are still code/static-content driven, not admin CMS driven.
- Wishlist is frontend-local browser storage and has no admin visibility or backend persistence.
