import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ContentPage({
  eyebrow,
  title,
  intro,
  body,
  actions,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string[];
  actions?: Array<{ href: string; label: string; variant?: "solid" | "outline" }>;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden border border-[color:var(--border)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)] px-6 py-4 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">{eyebrow}</p>
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[color:var(--muted)]">{intro}</p>
          <div className="mt-8 grid gap-4">
            {body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-[color:var(--foreground)]/90">
                {paragraph}
              </p>
            ))}
          </div>
          {actions?.length ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={
                    action.variant === "outline"
                      ? "inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]"
                      : "inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
                  }
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

