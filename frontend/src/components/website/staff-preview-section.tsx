"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";

import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import type { ApiListResult, PublicStaffMember } from "@/types/api";

const fallbackStaffMembers: PublicStaffMember[] = [
  {
    id: "fallback-1",
    slug: "senior-accounting-advisor",
    full_name: "Senior Accounting Advisor",
    role_title: "Accounting & Tax Advisory",
    short_description:
      "Supports businesses with accounting organization, tax compliance, reporting, and financial advisory.",
    photo_url:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80",
    display_order: 1,
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-2",
    slug: "audit-compliance-advisor",
    full_name: "Audit & Compliance Advisor",
    role_title: "Audit Preparation & Internal Controls",
    short_description:
      "Assists clients with audit files, risk review, internal controls, and compliance documentation.",
    photo_url:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80",
    display_order: 2,
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-3",
    slug: "client-service-coordinator",
    full_name: "Client Service Coordinator",
    role_title: "Client Support & Document Follow-up",
    short_description:
      "Helps clients submit requests, share documents, follow progress, and communicate with the advisory team.",
    photo_url:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=900&q=80",
    display_order: 3,
    created_at: "",
    updated_at: "",
  },
];

function getStaffItems(data: ApiListResult<PublicStaffMember> | PublicStaffMember[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items;
}

export function StaffPreviewSection() {
  const [staffMembers, setStaffMembers] =
    useState<PublicStaffMember[]>(fallbackStaffMembers);

  useEffect(() => {
    let cancelled = false;

    const loadStaff = async () => {
      try {
        const result = await api.get<
          ApiListResult<PublicStaffMember> | PublicStaffMember[]
        >(endpoints.public.staff({ homepage: true, page_size: 3 }));

        const items = getStaffItems(result.data).filter(Boolean);

        if (!cancelled && items.length > 0) {
          setStaffMembers(items.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setStaffMembers(fallbackStaffMembers);
        }
      }
    };

    void loadStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-softwhite py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              Our Staff
            </p>

            <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
              Meet Our Professional Team
            </h2>

            <p className="max-w-2xl text-gray-600">
              Our team combines accounting, tax, audit, compliance, and advisory
              experience to support clients with practical and professional
              service.
            </p>
          </div>

          <Link
            href="/staff"
            className="inline-flex items-center gap-2 rounded-lg border border-navy px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            View All Staff
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {staffMembers.map((member) => (
            <Link
              key={member.id || member.slug}
              href={`/staff/${member.slug}`}
              className="group overflow-hidden rounded-xl border border-gray-100 bg-lightgray shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.full_name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-navy-50">
                    <UserRound size={56} className="text-navy/40" />
                  </div>
                )}
              </div>

              <div className="p-6 text-center">
                <h3 className="mb-2 text-lg font-bold text-navy">
                  {member.full_name}
                </h3>

                <p className="mb-3 text-sm font-semibold text-teal">
                  {member.role_title}
                </p>

                {member.short_description ? (
                  <p className="text-sm leading-relaxed text-gray-600">
                    {member.short_description}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}