import Link from "next/link";
import { saveLandingPageAction, saveLandingPageSectionAction } from "@/app/admin/actions";
import { listLandingPages, getLandingPageSections, listProducts } from "@/server/store";
import { StatusPill } from "@/components/status-pill";
import { homepageCarouselItemsTemplate } from "@/lib/homepage-carousel";

const defaultSectionItemsJson = JSON.stringify([{ title: "Question", body: "Answer" }], null, 2);

export default async function AdminLandingPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const pages = await listLandingPages();
  const selected = pages.find((item) => item.id === edit) ?? pages[0];
  const sections = selected ? await getLandingPageSections(selected.id) : [];
  const products = await listProducts();

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Landing pages</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Landing page builder</h1>
      </div>

      <form action={saveLandingPageAction} className="grid gap-4 rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
          <span>Slug</span>
          <input name="slug" defaultValue={selected?.slug ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
          <span>Title</span>
          <input name="title" defaultValue={selected?.title ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)] sm:col-span-2">
          <span>Meta description</span>
          <input name="metaDescription" defaultValue={selected?.metaDescription ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)] sm:col-span-2">
          <span>Hero title</span>
          <input name="heroTitle" defaultValue={selected?.heroTitle ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)] sm:col-span-2">
          <span>Hero subtitle</span>
          <textarea name="heroSubtitle" rows={3} defaultValue={selected?.heroSubtitle ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
          <span>Banner image URL</span>
          <input name="bannerImageUrl" defaultValue={selected?.bannerImageUrl ?? "/hero-products.png"} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
          <span>Attached product IDs comma separated</span>
          <input name="attachedProductIds" defaultValue={selected?.attachedProductIds.join(", ") ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="published" defaultChecked={selected?.published ?? false} />
          <span>Published</span>
        </label>
        <button className="touch-target inline-flex h-11 w-fit items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)]">{selected ? "Update landing page" : "Create landing page"}</button>
      </form>

      {selected ? (
        <form action={saveLandingPageSectionAction} className="grid gap-4 rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6 sm:grid-cols-2">
          <input type="hidden" name="landingPageId" value={selected.id} />
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Type</span>
            <select name="type" className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--brand)]/60">
              <option value="banner">Banner</option>
              <option value="carousel">Slider / carousel</option>
              <option value="title">Title</option>
              <option value="subtitle">Subtitle</option>
              <option value="product_section">Product section</option>
              <option value="faq">FAQ</option>
              <option value="testimonials">Testimonials</option>
              <option value="cta">CTA</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Section title</span>
            <input name="title" className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)] sm:col-span-2">
            <span>Subtitle</span>
            <input name="subtitle" className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)] sm:col-span-2">
            <span>Body</span>
            <textarea name="body" rows={3} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Image URL</span>
            <input name="imageUrl" defaultValue="/hero-products.png" className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Product IDs comma separated</span>
            <input name="productIds" defaultValue={products.slice(0, 2).map((item) => item.id).join(", ")} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>CTA label</span>
            <input name="ctaLabel" className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>CTA href</span>
            <input name="ctaHref" defaultValue="/checkout" className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Sort order</span>
            <input name="sortOrder" type="number" defaultValue={sections.length + 1} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)] sm:col-span-2">
            <span>Items JSON for carousel/FAQ/testimonials</span>
            <textarea name="itemsJson" rows={8} defaultValue={selected.slug === "home" ? homepageCarouselItemsTemplate : defaultSectionItemsJson} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] font-mono text-xs outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
          </label>
          <button className="touch-target inline-flex h-11 w-fit items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)]">Add section</button>
        </form>
      ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {pages.map((page) => (
            <div key={page.id} className="rounded-3xl border border-[color:var(--border)] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[color:var(--foreground)]">{page.title}</h2>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{page.slug}</p>
                </div>
                <StatusPill label={page.published ? "published" : "draft"} tone={page.published ? "active" : "inactive"} />
              </div>
              <p className="mt-3 text-sm text-[color:var(--muted)]">{page.heroSubtitle}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/l/${page.slug}`} className="touch-target inline-flex h-11 items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)]">View</Link>
                <Link href={`/admin/landing-pages?edit=${page.id}`} className="touch-target inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)]">Edit</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Current sections for {selected?.slug}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sections.map((section) => (
              <div key={section.id} className="rounded-3xl border border-[color:var(--border)] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">{section.type}</p>
                <p className="mt-2 text-sm text-[color:var(--foreground)]">{section.title}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
