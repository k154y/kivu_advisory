import Link from "next/link";
import { ArrowRight, CheckCircle, Lock, ShieldCheck, Users } from "lucide-react";

const whyItems = [
  {
    icon: ShieldCheck,
    title: "Compliance Focused",
    desc: "We help businesses stay aligned with tax, accounting, payroll, and regulatory requirements.",
  },
  {
    icon: Lock,
    title: "Confidential Service",
    desc: "Client records, tax information, and business documents are handled with professional confidentiality.",
  },
  {
    icon: CheckCircle,
    title: "Accurate Work",
    desc: "We focus on reliable records, careful review, and clear financial reporting for better decisions.",
  },
  {
    icon: Users,
    title: "Client-Focused Support",
    desc: "Our workflow helps clients submit requests, share documents, and follow progress clearly.",
  },
];

export function ValuesSection() {
  return (
    <section className="bg-softwhite py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              Why Choose Us
            </p>

            <h2 className="mb-5 text-3xl font-bold text-navy sm:text-4xl">
              We Understand Your Business Needs
            </h2>

            <p className="mb-8 leading-relaxed text-gray-600">
              Businesses trust Kivu Advisory because we combine professional
              expertise with practical, client-focused service. We do not just
              process numbers — we help you understand your financial position,
              stay compliant, and make better decisions.
            </p>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 font-semibold text-navy transition-colors hover:text-teal"
            >
              Learn more about us
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {whyItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-xl bg-lightgray p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy">
                    <Icon size={18} className="text-white" />
                  </div>

                  <h3 className="mb-2 text-sm font-bold text-navy">
                    {item.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-gray-600">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}