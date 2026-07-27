# Admin Dashboard Frontend Remaining Audit

Date: 2026-07-27
Scope: admin dashboard frontend only (`/admin` routes, shared admin shell, and admin-facing UI components).

This audit lists what is still left on the admin dashboard frontend. It stays focused on the UI surfaces that an operator uses day to day, not the unrelated roadmap items that were explicitly removed from scope.

## Already Covered

- Dashboard overview exists with live counts for products, orders, revenue, and stock risk.
- Product CRUD exists with filtering, bulk upload, image upload, and variant editing.
- Categories, brands, coupons, payments, customers, reports, landing pages, and settings all have admin screens.
- The admin shell already has a branded layout, mobile menu, and role-based access gate.

## Remaining Listwise Audit

| # | Area | Status | What is left in the admin frontend | Evidence | Priority |
|---|---|---|---|---|---|
| 1 | Global admin shell | Partial | Tighten active-route highlighting, make the mobile drawer feel more deliberate, and reduce visual drift between desktop and mobile navigation. | `src/components/admin-shell.tsx`, `src/app/admin/layout.tsx` | P2 |
| 2 | Dashboard overview | Partial | Add richer operational views such as trend charts, aging-order panels, and low-stock alerts instead of only summary cards. | `src/app/admin/page.tsx` | P2 |
| 3 | Product list | Partial | Add pagination or better long-list handling, sorting controls, row bulk actions, and denser filtering for larger catalogs. | `src/app/admin/products/page.tsx`, `src/components/admin/products-filter-drawer.tsx` | P1 |
| 4 | Product editor | Partial | Break the long form into clearer sections, surface save/loading feedback more clearly, and make image and variant editing easier to scan. | `src/components/admin/product-editor-form.tsx`, `src/components/admin/product-image-uploader.tsx`, `src/components/admin/product-variant-editor.tsx` | P1 |
| 5 | Bulk product upload | Partial | Add clearer upload progress, error reporting, and validation feedback for import failures. | `src/components/admin/product-bulk-upload.tsx`, `src/app/admin/products/upload-template/route.ts` | P2 |
| 6 | Orders management | Partial | Add search, filters, and a stronger order-detail view so the operator does not have to read and act on every card inline. | `src/app/admin/orders/page.tsx` | P1 |
| 7 | Customers page | Partial | Add search, customer drill-down, and order-history context; the screen is still mostly a list view. | `src/app/admin/customers/page.tsx` | P2 |
| 8 | Payments page | Partial | Add filters, export/copy affordances, and a friendlier presentation of payment payloads. | `src/app/admin/payments/page.tsx` | P2 |
| 9 | Landing pages builder | Partial | Add section ordering, clearer section actions, more visual carousel editing, and a preview-oriented workflow. | `src/app/admin/landing-pages/page.tsx` | P1 |
| 10 | Settings page | Partial | Group the long configuration form into clearer sections, improve mobile spacing, and show validation feedback closer to each field group. | `src/app/admin/settings/page.tsx` | P1 |
| 11 | Reports page | Partial | Replace the two-number summary with trends, date range controls, and export-friendly reporting. | `src/app/admin/reports/page.tsx` | P2 |
| 12 | Control consistency | Partial | Normalize button sizing, helper text, empty states, and disabled/loading states across admin forms so the screens feel like one system. | `src/app/admin/*.tsx`, `src/components/admin/*.tsx` | P2 |

## Practical Read

- The admin dashboard frontend is already functional for core operations.
- What remains is mostly interface depth, not missing core screens.
- The biggest visible wins now are better navigation clarity, denser list handling, and cleaner form workflows.

