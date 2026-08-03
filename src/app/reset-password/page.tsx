import { PublicShell } from "@/components/public-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <PublicShell>
        <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Reset password</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Invalid link</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
              This password reset link is invalid or missing a token.
            </p>
            <div className="mt-6 text-center">
              <Link href="/forgot-password" className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                Request new link
              </Link>
            </div>
          </div>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Reset password</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Create a new password</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            Your new password must be at least 8 characters long.
          </p>

          <ResetPasswordForm token={token} />

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