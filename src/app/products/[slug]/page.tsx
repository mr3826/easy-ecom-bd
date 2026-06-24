import Image from "next/image";
import { notFound } from "next/navigation";
import { MessageCircleMore, PhoneCall, ShieldCheck, Truck } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { addToCartAction } from "@/app/actions";
import { getProductBySlug, getSettings, listCategories, listProductImages, getState } from "@/server/store";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [categories, images, settings] = await Promise.all([
    listCategories(),
    listProductImages(product.id),
    getSettings(),
  ]);
  const category = categories.find((entry) => entry.id === product.categoryId);
  const state = await getState();
  const brand = state.brands.find((entry) => entry.id === product.brandId);
  const supportDigits = settings.contactNumber.replace(/\D/g, "");
  const gallery = images.length ? images : [{ id: "fallback", productId: product.id, url: "/hero-products.png", alt: product.name, sortOrder: 1 }];

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 pb-28 sm:px-6 md:pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[4/3] bg-slate-100">
              <Image src={gallery[0].url} alt={gallery[0].alt || product.name} fill className="object-cover" priority />
            </div>
          </div>
          {gallery.length > 1 ? (
            <div className="grid grid-cols-3 gap-3">
              {gallery.slice(1, 4).map((image) => (
                <div key={image.id} className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image src={image.url} alt={image.alt || product.name} fill className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <StatusPill label={product.featured ? "Featured" : "Live"} tone={product.featured ? "active" : "processing"} />
            <span className="text-sm text-slate-500">{category?.name}</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950">{product.name}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{product.description}</p>

          <div className="mt-6 flex items-end gap-4">
            <p className="text-4xl font-semibold text-slate-950">{money(product.price)}</p>
            {product.compareAtPrice ? <p className="pb-1 text-lg text-slate-400 line-through">{money(product.compareAtPrice)}</p> : null}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">SKU</dt>
              <dd className="mt-1 font-medium text-slate-950">{product.sku}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">Stock</dt>
              <dd className="mt-1 font-medium text-slate-950">{product.stock}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">Brand</dt>
              <dd className="mt-1 font-medium text-slate-950">{brand?.name}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">Tags</dt>
              <dd className="mt-1 font-medium text-slate-950">{product.tags.join(", ")}</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <div className="rounded-3xl bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Truck className="h-4 w-4" />
                <p className="text-sm font-semibold">Delivery promise</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Fast dispatch after order confirmation with delivery charge shown at checkout.
              </p>
            </div>
            <div className="rounded-3xl bg-sky-50 p-4">
              <div className="flex items-center gap-2 text-sky-700">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-sm font-semibold">Return policy</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Easy return support for damaged or wrong items, handled through the admin team.
              </p>
            </div>
          </div>

          <form action={addToCartAction} className="mt-8 flex flex-wrap items-center gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <label className="grid w-24 gap-2 text-sm">
              <span className="text-slate-600">Qty</span>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none ring-0 focus:border-slate-400"
              />
            </label>
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Add to cart
            </button>
          </form>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={`tel:${supportDigits}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <PhoneCall className="h-4 w-4" />
              Call support
            </a>
            <a
              href={`https://wa.me/${supportDigits}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <MessageCircleMore className="h-4 w-4" />
              WhatsApp support
            </a>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-7xl gap-3">
          <form action={addToCartAction} className="grid gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value={1} />
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Add to cart
            </button>
          </form>
          <div className="grid grid-cols-2 gap-3 text-sm font-semibold">
            <a
              href={`tel:${supportDigits}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-900"
            >
              <PhoneCall className="h-4 w-4" />
              Call
            </a>
            <a
              href={`https://wa.me/${supportDigits}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-white"
            >
              <MessageCircleMore className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
