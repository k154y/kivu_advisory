"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck } from "lucide-react";

import { getWebsiteContentBlock } from "@/lib/website-content";

const fallbackHero = {
  title: "Accounting, Tax and Business Advisory Services You Can Trust",
  description:
    "We help businesses stay compliant, organized, and financially informed through reliable accounting, tax, payroll, audit, and business advisory services.",
  image:
    "https://i.pinimg.com/736x/d9/5f/a2/d95fa2e54430cc814c46a78fbbccf07e.jpg",
  buttonLabel: "Request a Service",
  buttonUrl: "/request-service",
};

const backupHeroImages = [
  "https://i.pinimg.com/736x/d9/5f/a2/d95fa2e54430cc814c46a78fbbccf07e.jpg",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
];

export function HomeHero() {
  const [title, setTitle] = useState(fallbackHero.title);
  const [description, setDescription] = useState(fallbackHero.description);
  const [mainImage, setMainImage] = useState(fallbackHero.image);
  const [buttonLabel, setButtonLabel] = useState(fallbackHero.buttonLabel);
  const [buttonUrl, setButtonUrl] = useState(fallbackHero.buttonUrl);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const heroImages = useMemo(() => {
    const images = [mainImage, ...backupHeroImages].filter(Boolean);
    return Array.from(new Set(images));
  }, [mainImage]);

  useEffect(() => {
    let cancelled = false;

    const loadHeroContent = async () => {
      const block = await getWebsiteContentBlock("home_hero");

      if (!block || cancelled) return;

      setTitle(block.title || fallbackHero.title);
      setDescription(block.summary || block.body || fallbackHero.description);
      setMainImage(block.image_url || fallbackHero.image);
      setButtonLabel(block.button_label || fallbackHero.buttonLabel);
      setButtonUrl(block.button_url || fallbackHero.buttonUrl);
    };

    void loadHeroContent();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % heroImages.length);
    }, 5500);

    return () => window.clearInterval(interval);
  }, [heroImages.length]);

  return (
    <section className="relative min-h-[720px] overflow-hidden bg-navy text-white">
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <img
            key={image}
            src={image}
            alt="Kivu Advisory professional services"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              index === activeImageIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{
              animation:
                index === activeImageIndex ? "heroFadeIn 5.5s ease-out" : "",
            }}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[720px] max-w-7xl items-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
            Kivu Advisory · Accounting · Tax · Audit · Business Advisory
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            {description}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={buttonUrl}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3.5 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
            >
              {buttonLabel}
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/book-consultation"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
            >
              <CalendarCheck size={18} />
              Book Consultation
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/75">
            <div>
              <p className="text-2xl font-bold text-white">10+</p>
              <p>Years Experience</p>
            </div>

            <div>
              <p className="text-2xl font-bold text-white">6+</p>
              <p>Core Services</p>
            </div>

            <div>
              <p className="text-2xl font-bold text-white">24h</p>
              <p>Response Target</p>
            </div>
          </div>
        </div>
      </div>

      {heroImages.length > 1 ? (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {heroImages.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActiveImageIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeImageIndex
                  ? "w-8 bg-gold"
                  : "w-2.5 bg-white/50 hover:bg-white"
              }`}
              aria-label={`Show hero image ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}