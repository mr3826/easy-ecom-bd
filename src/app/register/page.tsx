import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { registerAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <PublicShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Register</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Create your account</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            The signup page now uses the existing backend registration action so account creation is part of the working storefront instead of a redirect stub.
          </p>

          <form action={registerAction} className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[color:var(--foreground)]">Full name</span>
              <input name="name" type="text" required autoComplete="name" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 outline-none" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[color:var(--foreground)]">Email</span>
              <input name="email" type="email" required autoComplete="email" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 outline-none" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[color:var(--foreground)]">Phone</span>
              <input name="phone" type="tel" autoComplete="tel" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 outline-none" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[color:var(--foreground)]">Password</span>
              <input name="password" type="password" required autoComplete="new-password" minLength={8} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 outline-none" />
            </label>
            <button className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Create account
            </button>
          </form>
        </div>

        <div className="border border-[color:var(--border)] bg-[#111111] p-6 text-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">Already have an account?</p>
          <p className="mt-4 text-sm leading-7 text-white/80">
            Sign in to view your account, track orders, and keep your saved details available for faster checkout.
          </p>
          <div className="mt-8 grid gap-3">
            <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#111111]">
              Sign in
            </Link>
            <Link href="/shop" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Browse shop
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
