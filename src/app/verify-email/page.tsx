import { PublicShell } from "@/components/public-shell";
import { VerifyEmailForm } from "@/components/verify-email-form";
import { ResendVerificationForm } from "@/components/resend-verification-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <PublicShell>
        <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Verify email</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Invalid link</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
              This verification link is invalid or missing a token.
            </p>
            <div className="mt-6 text-center">
              <Link href="/verify-email" className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                Resend verification
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Verify email</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Confirm your email address</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            Click the button below to verify your email address. This link expires in 24 hours.
          </p>

          <VerifyEmailForm token={token} />

          <div className="mt-6 border-t border-[color:var(--border)] pt-6">
            <p className="text-sm text-[color:var(--muted)]">Didn't receive the email?</p>
            <ResendVerificationForm />
          </div>

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