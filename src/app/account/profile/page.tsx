import { PublicShell } from "@/components/public-shell";
import { getCurrentUser } from "@/server/auth";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <PublicShell>
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] text-center">
            <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">Sign in to edit your profile</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">You need to be logged in to access this page.</p>
            <a href="/login" className="mt-6 inline-flex rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Sign in
            </a>
          </div>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Profile</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Edit profile</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            Update your personal information. If you change your email address, a verification email will be sent to the new address.
          </p>

          <ProfileForm
            initialData={{
              name: user.name,
              email: user.email,
              phone: user.phone,
            }}
          />
        </div>
      </section>
    </PublicShell>
  );
}