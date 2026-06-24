import { PublicShell } from "@/components/public-shell";
import { loginAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <PublicShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Login</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Customer or admin access</h1>
          <form action={loginAction} className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input name="email" type="email" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Password</span>
              <input name="password" type="password" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Sign in</button>
          </form>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Demo accounts</p>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
            <p>
              Admin: <span className="font-mono text-white">admin@easy-ecom.test</span> / <span className="font-mono text-white">admin1234</span>
            </p>
            <p>
              Customer: <span className="font-mono text-white">amina@example.com</span> / <span className="font-mono text-white">customer1234</span>
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
