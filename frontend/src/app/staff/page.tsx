import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";

const staffMembers = [
  {
    slug: "senior-accounting-advisor",
    full_name: "Senior Accounting Advisor",
    role_title: "Accounting & Tax Advisory",
    short_description:
      "Supports businesses with accounting organization, tax compliance, reporting, and financial advisory.",
    photo_url:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80",
  },
  {
    slug: "audit-compliance-advisor",
    full_name: "Audit & Compliance Advisor",
    role_title: "Audit Preparation & Internal Controls",
    short_description:
      "Assists clients with audit files, risk review, internal controls, and compliance documentation.",
    photo_url:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80",
  },
  {
    slug: "client-service-coordinator",
    full_name: "Client Service Coordinator",
    role_title: "Client Support & Document Follow-up",
    short_description:
      "Helps clients submit requests, share documents, follow progress, and communicate with the advisory team.",
    photo_url:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=900&q=80",
  },
];

export default function StaffPage() {
  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            Our Staff
          </p>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Meet the Professionals Behind Kivu Advisory
          </h1>

          <p className="mt-6 max-w-2xl leading-relaxed text-white/75">
            Our team supports clients with accounting, tax, payroll, audit,
            compliance, document follow-up, and business advisory services.
          </p>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {staffMembers.map((member) => (
              <Link
                key={member.slug}
                href={`/staff/${member.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-100 bg-softwhite shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                  <img
                    src={member.photo_url}
                    alt={member.full_name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="p-6 text-center">
                  <h2 className="mb-2 text-lg font-bold text-navy">
                    {member.full_name}
                  </h2>

                  <p className="mb-3 text-sm font-semibold text-teal">
                    {member.role_title}
                  </p>

                  <p className="mb-5 text-sm leading-relaxed text-gray-600">
                    {member.short_description}
                  </p>

                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-all group-hover:gap-2">
                    View Profile
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}