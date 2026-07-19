"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import { api } from "@/lib/api";

type PublicTestimonial = {
  id: string;
  client_name: string;
  client_role?: string;
  company_name?: string;
  content: string;
  rating?: number;
  photo_url?: string;
  is_featured?: boolean;
  display_order?: number;
  is_active?: boolean;
};

const fallbackTestimonials: PublicTestimonial[] = [
  {
    id: "fallback-1",
    client_name: "Business Client",
    client_role: "Managing Director",
    company_name: "Private Company",
    content:
      "Kivu Advisory helped us organize our accounting records and understand our tax obligations more clearly.",
    rating: 5,
    display_order: 1,
    is_active: true,
    is_featured: true,
  },
  {
    id: "fallback-2",
    client_name: "Institution Client",
    client_role: "Finance Officer",
    company_name: "Local Institution",
    content:
      "The service was professional, confidential, and clear. We appreciated the structured document follow-up.",
    rating: 5,
    display_order: 2,
    is_active: true,
    is_featured: true,
  },
  {
    id: "fallback-3",
    client_name: "Entrepreneur Client",
    client_role: "Founder",
    company_name: "Small Business",
    content:
      "Their advisory support helped us improve how we manage finances, reports, and business planning.",
    rating: 5,
    display_order: 3,
    is_active: true,
    is_featured: true,
  },
];

function getTestimonialItems(response: unknown): PublicTestimonial[] {
  if (Array.isArray(response)) {
    return response as PublicTestimonial[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const objectResponse = response as {
    items?: PublicTestimonial[];
    data?:
      | PublicTestimonial[]
      | {
          items?: PublicTestimonial[];
        };
  };

  if (Array.isArray(objectResponse.items)) {
    return objectResponse.items;
  }

  if (Array.isArray(objectResponse.data)) {
    return objectResponse.data;
  }

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function getRating(value?: number) {
  const rating = Number(value) || 5;
  return Math.min(5, Math.max(1, rating));
}

export function TestimonialsSection() {
  const [testimonials, setTestimonials] =
    useState<PublicTestimonial[]>(fallbackTestimonials);

  useEffect(() => {
    let cancelled = false;

    const loadTestimonials = async () => {
      try {
        const result = await api.get<unknown>(
          "/testimonials?featured=true&page_size=6",
        );

        const items = getTestimonialItems(result.data)
          .filter((item) => item.is_active !== false)
          .sort(
            (a, b) =>
              (a.display_order || 0) - (b.display_order || 0),
          );

        if (!cancelled && items.length > 0) {
          setTestimonials(items);
        }
      } catch {
        if (!cancelled) {
          setTestimonials(fallbackTestimonials);
        }
      }
    };

    void loadTestimonials();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-softwhite py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
            Client Testimonials
          </p>

          <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
            What Our Clients Say
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-100 bg-lightgray p-6"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: getRating(item.rating) }).map(
                  (_, index) => (
                    <Star
                      key={index}
                      size={14}
                      className="fill-gold text-gold"
                    />
                  ),
                )}
              </div>

              <blockquote className="mb-5 text-sm italic leading-relaxed text-gray-700">
                &ldquo;{item.content}&rdquo;
              </blockquote>

              <div>
                <p className="text-sm font-bold text-navy">
                  {item.client_name}
                </p>

                {(item.client_role || item.company_name) ? (
                  <p className="text-xs text-gray-500">
                    {[item.client_role, item.company_name]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}