import { PublicShell } from "@/components/public-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Forgot password</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Reset your password</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            Enter your email address and we&apos;ll send you a link to create a new password.
          </p>

          <ForgotPasswordForm />

          <div className="mt-6 text-center text-sm text-[color:var(--muted)]">
            <Link href="/login" className="font-medium text-[color:var(--brand)] hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}