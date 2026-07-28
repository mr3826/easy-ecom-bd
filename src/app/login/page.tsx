import { PublicShell } from "@/components/public-shell";
import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const showDemoAccounts = process.env.NODE_ENV !== "production";

  return (
    <PublicShell>
      <section
        className={`mx-auto grid gap-8 px-4 py-12 sm:px-6 lg:px-8 ${
          showDemoAccounts ? "max-w-6xl lg:grid-cols-2" : "max-w-2xl"
        }`}
      >
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Login</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Customer or admin access</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            Sign in to manage your account, orders, or store operations.
          </p>

          <LoginForm />
        </div>

        {showDemoAccounts ? (
          <div className="border border-[color:var(--border)] bg-[#111111] p-6 text-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">Demo accounts</p>
            <div className="mt-6 space-y-4 text-sm leading-7 text-white/80">
              <p>
                Admin: <span className="font-mono text-white">admin@easy-ecom.test</span> / <span className="font-mono text-white">admin1234</span>
              </p>
              <p>
                Customer: <span className="font-mono text-white">amina@example.com</span> / <span className="font-mono text-white">customer1234</span>
              </p>
            </div>
            <div className="mt-8 grid gap-3">
              <Link href="/shop" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#111111]">
                Browse shop
              </Link>
              <Link href="/track-order" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                Track order
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </PublicShell>
  );
}
