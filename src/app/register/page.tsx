import { PublicShell } from "@/components/public-shell";
import { registerAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Register</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Create a customer account</h1>
          <form action={registerAction} className="mt-8 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Name</span>
                <input name="name" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Phone</span>
                <input name="phone" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              </label>
            </div>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input name="email" type="email" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Password</span>
              <input name="password" type="password" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Create account</button>
          </form>
        </div>
      </section>
    </PublicShell>
  );
}
