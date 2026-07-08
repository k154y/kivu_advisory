import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";

const staffMembers = [
  {
    slug: "senior-accounting-advisor",
    full_name: "Senior Accounting Advisor",
    role_title: "Accounting & Tax Advisory",
    short_description:
      "Supports businesses with accounting organization, tax compliance, reporting, and financial advisory.",
    bio:
      "A professional advisor supporting businesses and institutions with accounting, taxation, reporting, and practical financial management guidance.",
    education_background:
      "Academic background in accounting, finance, taxation, business administration, and professional financial reporting.",
    work_experience:
      "Experience in bookkeeping, tax declarations, financial statements, payroll support, audit preparation, compliance review, and advisory services.",
    professional_certifications:
      "Professional training in accounting, tax compliance, financial reporting, internal control, and business advisory practices.",
    email: "info@kivuadvisory.com",
    phone: "0786196355",
    photo_url:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80",
    show_contact: true,
  },
  {
    slug: "audit-compliance-advisor",
    full_name: "Audit & Compliance Advisor",
    role_title: "Audit Preparation & Internal Controls",
    short_description:
      "Assists clients with audit files, risk review, internal controls, and compliance documentation.",
    bio:
      "A compliance-focused professional helping organizations prepare audit files, improve internal controls, and organize supporting documents.",
    education_background:
      "Academic background in accounting, auditing, risk management, compliance, and organizational control systems.",
    work_experience:
      "Experience in audit preparation, documentation review, internal control checks, risk identification, and compliance support.",
    professional_certifications:
      "Training in audit support, internal control review, governance, compliance documentation, and financial record review.",
    email: "info@kivuadvisory.com",
    phone: "0786196355",
    photo_url:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80",
    show_contact: true,
  },
  {
    slug: "client-service-coordinator",
    full_name: "Client Service Coordinator",
    role_title: "Client Support & Document Follow-up",
    short_description:
      "Helps clients submit requests, share documents, follow progress, and communicate with the advisory team.",
    bio:
      "A client-focused coordinator supporting communication, document follow-up, service request tracking, and client assistance.",
    education_background:
      "Academic background in administration, client service, office management, communication, and business support.",
    work_experience:
      "Experience in client communication, administrative support, document management, request tracking, and service coordination.",
    professional_certifications:
      "Training in client support, office administration, communication, document management, and digital service workflows.",
    email: "info@kivuadvisory.com",
    phone: "0786196355",
    photo_url:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=900&q=80",
    show_contact: true,
  },
];

type StaffDetailPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function StaffDetailPage({ params }: StaffDetailPageProps) {
  const resolvedParams = await params;
  const staff = staffMembers.find((member) => member.slug === resolvedParams.slug);

  if (!staff) {
    notFound();
  }

  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/staff"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to staff
          </Link>

          <div className="grid gap-10 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-center">
            <div className="overflow-hidden rounded-2xl bg-white/10 shadow-lg">
              <img
                src={staff.photo_url}
                alt={staff.full_name}
                className="h-[420px] w-full object-cover"
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
                Staff Profile
              </p>

              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                {staff.full_name}
              </h1>

              <p className="mt-4 text-lg font-semibold text-teal-100">
                {staff.role_title}
              </p>

              <p className="mt-6 max-w-2xl leading-relaxed text-white/75">
                {staff.short_description}
              </p>

              {staff.show_contact ? (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`mailto:${staff.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
                  >
                    <Mail size={16} />
                    Email
                  </a>

                  <a
                    href={`tel:${staff.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
                  >
                    <Phone size={16} />
                    Call
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-xl border border-gray-100 bg-softwhite p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
              <UserRound size={20} className="text-teal" />
            </div>

            <h2 className="mb-3 text-xl font-bold text-navy">Short Bio</h2>

            <p className="leading-relaxed text-gray-600">{staff.bio}</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-softwhite p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
              <GraduationCap size={20} className="text-teal" />
            </div>

            <h2 className="mb-3 text-xl font-bold text-navy">
              Education Background
            </h2>

            <p className="leading-relaxed text-gray-600">
              {staff.education_background}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-softwhite p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
              <Briefcase size={20} className="text-teal" />
            </div>

            <h2 className="mb-3 text-xl font-bold text-navy">
              Work Experience
            </h2>

            <p className="leading-relaxed text-gray-600">
              {staff.work_experience}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-softwhite p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
              <Award size={20} className="text-teal" />
            </div>

            <h2 className="mb-3 text-xl font-bold text-navy">
              Professional Certifications
            </h2>

            <p className="leading-relaxed text-gray-600">
              {staff.professional_certifications}
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}