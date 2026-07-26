"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeHeroSlide } from "@/lib/homepage-carousel";

export function HomeHeroSlider({ slides }: { slides: HomeHeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  const goToSlide = (nextIndex: number) => {
    setActiveIndex((nextIndex + slides.length) % slides.length);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div
        className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--border)] bg-white shadow-[0_18px_50px_rgba(139,0,0,0.08)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,0,0,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.12),transparent_28%)]" />

        <div
          className="relative flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <article key={slide.id} className="w-full shrink-0">
              <div className="grid min-h-[32rem] gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_0.95fr] lg:gap-10 lg:p-10">
                <div className={cn("flex flex-col justify-center", slide.reverse ? "lg:order-2" : "lg:order-1")}>
                  <span className="inline-flex w-fit items-center rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand)]">
                    {slide.eyebrow}
                  </span>

                  <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.96] tracking-tight text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
                    {slide.title}
                  </h1>

                  <p className="mt-4 max-w-xl text-base leading-8 text-[color:var(--muted)] sm:text-lg">
                    {slide.description}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href={slide.primaryCta.href}
                      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand)] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_14px_28px_rgba(139,0,0,0.18)] transition hover:bg-[color:var(--accent)]"
                    >
                      {slide.primaryCta.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    {slide.secondaryCta ? (
                      <Link
                        href={slide.secondaryCta.href}
                        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                      >
                        {slide.secondaryCta.label}
                      </Link>
                    ) : null}
                  </div>

                  {slide.chips?.length ? (
                    <div className="mt-7 flex flex-wrap gap-2">
                      {slide.chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[color:var(--muted)]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className={cn("flex items-center", slide.reverse ? "lg:order-1" : "lg:order-2")}>
                  <div className="relative min-h-[20rem] w-full overflow-hidden rounded-[2rem] border border-white/60 bg-[color:var(--surface-soft)] shadow-[0_20px_45px_rgba(15,23,42,0.12)] lg:min-h-[28rem]">
                    <div className={cn("absolute inset-0 bg-gradient-to-br", slide.accentClass)} />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))]" />
                    <Image
                      src={slide.imageSrc}
                      alt={slide.imageAlt}
                      fill
                      priority={index === 0}
                      className={cn("object-cover object-center mix-blend-multiply transition duration-700", slide.reverse ? "scale-[1.03]" : "scale-[1.01]")}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />

                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                        New arrivals
                      </span>
                      <span className="rounded-full bg-white/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground)]">
                        Responsive slider
                      </span>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">{slide.eyebrow}</p>
                        <p className="mt-2 max-w-[16rem] text-2xl font-black leading-tight sm:text-3xl">
                          {slide.title}
                        </p>
                      </div>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/14 text-white backdrop-blur">
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-between gap-4 px-5 sm:px-7 lg:px-10">
            <div className="flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`Show slide ${index + 1}`}
                  aria-current={activeIndex === index}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300",
                    activeIndex === index ? "w-10 bg-[color:var(--brand)]" : "w-2.5 bg-[color:var(--border)]",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToSlide(activeIndex - 1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white/90 text-[color:var(--foreground)] shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goToSlide(activeIndex + 1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white/90 text-[color:var(--foreground)] shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                aria-label="Next slide"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
