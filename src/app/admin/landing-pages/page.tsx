import Link from "next/link";
import { saveLandingPageAction, saveLandingPageSectionAction } from "@/app/admin/actions";
import { listLandingPages, getLandingPageSections, listProducts } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default async function AdminLandingPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const pages = listLandingPages();
  const selected = pages.find((item) => item.id === edit) ?? pages[0];
  const sections = selected ? getLandingPageSections(selected.id) : [];
  const products = listProducts();

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Landing pages</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Landing page builder</h1>
      </div>

      <form action={saveLandingPageAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-2">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <label className="grid gap-2 text-sm">
          <span>Slug</span>
          <input name="slug" defaultValue={selected?.slug ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Title</span>
          <input name="title" defaultValue={selected?.title ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Meta description</span>
          <input name="metaDescription" defaultValue={selected?.metaDescription ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Hero title</span>
          <input name="heroTitle" defaultValue={selected?.heroTitle ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Hero subtitle</span>
          <textarea name="heroSubtitle" rows={3} defaultValue={selected?.heroSubtitle ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Banner image URL</span>
          <input name="bannerImageUrl" defaultValue={selected?.bannerImageUrl ?? "/hero-products.png"} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Attached product IDs comma separated</span>
          <input name="attachedProductIds" defaultValue={selected?.attachedProductIds.join(", ") ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="published" defaultChecked={selected?.published ?? false} />
          <span>Published</span>
        </label>
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">{selected ? "Update landing page" : "Create landing page"}</button>
      </form>

      {selected ? (
        <form action={saveLandingPageSectionAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 md:grid-cols-2">
          <input type="hidden" name="landingPageId" value={selected.id} />
          <label className="grid gap-2 text-sm">
            <span>Type</span>
            <select name="type" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
              <option value="banner">Banner</option>
              <option value="title">Title</option>
              <option value="subtitle">Subtitle</option>
              <option value="product_section">Product section</option>
              <option value="faq">FAQ</option>
              <option value="testimonials">Testimonials</option>
              <option value="cta">CTA</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Section title</span>
            <input name="title" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span>Subtitle</span>
            <input name="subtitle" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span>Body</span>
            <textarea name="body" rows={3} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Image URL</span>
            <input name="imageUrl" defaultValue="/hero-products.png" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Product IDs comma separated</span>
            <input name="productIds" defaultValue={products.slice(0, 2).map((item) => item.id).join(", ")} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>CTA label</span>
            <input name="ctaLabel" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>CTA href</span>
            <input name="ctaHref" defaultValue="/checkout" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Sort order</span>
            <input name="sortOrder" type="number" defaultValue={sections.length + 1} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span>Items JSON for FAQ/testimonials</span>
            <textarea name="itemsJson" rows={4} defaultValue='[{"title":"Question","body":"Answer"}]' className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white font-mono text-xs" />
          </label>
          <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">Add section</button>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {pages.map((page) => (
          <div key={page.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{page.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{page.slug}</p>
              </div>
              <StatusPill label={page.published ? "published" : "draft"} tone={page.published ? "active" : "inactive"} />
            </div>
            <p className="mt-4 text-sm text-slate-300">{page.heroSubtitle}</p>
            <div className="mt-4 flex gap-3">
              <Link href={`/l/${page.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">View</Link>
              <Link href={`/admin/landing-pages?edit=${page.id}`} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">Edit</Link>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
        <h2 className="text-xl font-semibold text-white">Current sections for {selected?.slug}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{section.type}</p>
              <p className="mt-2 text-white">{section.title}</p>
              <p className="mt-1 text-sm text-slate-300">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

