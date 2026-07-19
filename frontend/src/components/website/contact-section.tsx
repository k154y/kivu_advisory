"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PhoneCall } from "lucide-react";

import { getWebsiteContentBlock } from "@/lib/website-content";

const fallbackContent = {
  title: "Need Professional Accounting or Tax Support?",
  description:
    "Send us your request today and our team will review your needs, guide you on required documents, and contact you with the next steps.",
  buttonLabel: "Request a Service",
  buttonUrl: "/request-service",
};

export function ContactSection() {
  const [title, setTitle] = useState(fallbackContent.title);
  const [description, setDescription] = useState(fallbackContent.description);
  const [buttonLabel, setButtonLabel] = useState(fallbackContent.buttonLabel);
  const [buttonUrl, setButtonUrl] = useState(fallbackContent.buttonUrl);

  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      const block = await getWebsiteContentBlock("home_contact_cta");

      if (!block || cancelled) return;

      setTitle(block.title || fallbackContent.title);
      setDescription(block.summary || block.body || fallbackContent.description);
      setButtonLabel(block.button_label || fallbackContent.buttonLabel);
      setButtonUrl(block.button_url || fallbackContent.buttonUrl);
    };

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-navy py-20 text-white">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
          Let&apos;s Work Together
        </p>

        <h2 className="mx-auto mb-5 max-w-3xl text-3xl font-bold sm:text-4xl">
          {title}
        </h2>

        <p className="mx-auto mb-8 max-w-2xl leading-relaxed text-white/75">
          {description}
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={buttonUrl}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3.5 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
          >
            {buttonLabel}
            <ArrowRight size={18} />
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
          >
            <PhoneCall size={18} />
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}