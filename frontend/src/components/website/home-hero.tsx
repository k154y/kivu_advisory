"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type HomeHeroProps = {
  title?: string;
  description?: string;
  heroImages?: string[];
};

const defaultHeroImages = [
  "https://i.pinimg.com/736x/d9/5f/a2/d95fa2e54430cc814c46a78fbbccf07e.jpg",
];

const trustItems = ["Confidential", "Professional", "RRA Compliant", "Timely"];

export function HomeHero({
  title = "Accounting, Tax & Business Advisory Services You Can Trust",
  description = "We help businesses and individuals stay compliant, organized, and financially informed through reliable accounting, tax, payroll, audit, and advisory support.",
  heroImages = defaultHeroImages,
}: HomeHeroProps) {
  const images = useMemo(() => {
    const cleanImages = heroImages.map((image) => image.trim()).filter(Boolean);
    return cleanImages.length > 0 ? cleanImages : defaultHeroImages;
  }, [heroImages]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % images.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [images.length]);

  const activeImage = images[activeImageIndex];

  return (
    <section className="relative min-h-[332px] overflow-hidden bg-navy text-white">
      <div
        key={activeImage}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("${activeImage}")`,
          animation: "heroFadeIn 900ms ease-out",
        }}
      />

      <div className="absolute inset-0 bg-navy/75" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/40" />

      <div className="relative mx-auto flex min-h-[412px] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-gold">
            Kivu Advisory
          </p>

          <h1 className="mb-5 max-w-2xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-5xl">
            {title}
          </h1>

          <p className="mb-7 max-w-xl text-pretty text-base leading-7 text-white/85 sm:text-lg">
            {description}
          </p>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request-service"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-gold-600"
            >
              Request a Service
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/book-consultation"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/70 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white hover:text-navy"
            >
              Book Consultation
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-teal-100" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {images.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              aria-label={`Show hero image ${index + 1}`}
              onClick={() => setActiveImageIndex(index)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                activeImageIndex === index
                  ? "w-8 bg-gold"
                  : "w-2.5 bg-white/60 hover:bg-white",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export type { HomeHeroProps };