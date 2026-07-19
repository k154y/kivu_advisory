import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/lib/routes";

const services = [
  {
    slug: "accounting-bookkeeping",
    title: "Accounting & Bookkeeping",
    category: "Accounting",
    description:
      "Support for organized financial records, bookkeeping, account reconciliation, and regular financial reporting.",
    duration: "Monthly or periodic support",
    priceLabel: "Quotation after review",
  },
  {
    slug: "tax-advisory",
    title: "Tax Advisory",
    category: "Tax",
    description:
      "Assistance with tax compliance, declarations, tax planning, and communication with tax authorities.",
    duration: "Based on tax need",
    priceLabel: "Quotation after review",
  },
  {
    slug: "audit-preparation",
    title: "Audit Preparation",
    category: "Audit",
    description:
      "Preparation of accounting files, schedules, supporting documents, and review files before audit engagement.",
    duration: "Project-based",
    priceLabel: "Quotation after review",
  },
  {
    slug: "business-advisory",
    title: "Business Advisory",
    category: "Advisory",
    description:
      "Financial and business guidance for planning, budgeting, internal controls, compliance, and decision-making.",
    duration: "Consultation or project-based",
    priceLabel: "Quotation after review",
  },
  {
    slug: "company-compliance",
    title: "Company Compliance",
    category: "Compliance",
    description:
      "Support for company records, governance documents, statutory obligations, and administrative compliance.",
    duration: "As required",
    priceLabel: "Quotation after review",
  },
  {
    slug: "training-support",
    title: "Training & Support",
    category: "Training",
    description:
      "Training support for accounting teams, finance staff, internal control practices, and reporting processes.",
    duration: "Session-based",
    priceLabel: "Quotation after review",
  },
];

export function PublicServicesList() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <Card
          key={service.slug}
          className="flex flex-col transition hover:-translate-y-1 hover:shadow-lg"
        >
          <CardHeader>
            <Badge variant="default" className="w-fit">
              {service.category}
            </Badge>

            <CardTitle className="mt-4">{service.title}</CardTitle>

            <CardDescription>{service.description}</CardDescription>
          </CardHeader>

          <CardContent className="mt-auto space-y-5">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="font-medium text-slate-500">
                  Estimated duration
                </dt>
                <dd className="mt-1 text-slate-800">{service.duration}</dd>
              </div>

              <div>
                <dt className="font-medium text-slate-500">Price</dt>
                <dd className="mt-1 text-slate-800">{service.priceLabel}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-3">
              <Link
                href={routes.serviceDetail(service.slug)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
              >
                View details
              </Link>

              <Link
                href={routes.requestService}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2742] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#16385D]"
              >
                Request service
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}