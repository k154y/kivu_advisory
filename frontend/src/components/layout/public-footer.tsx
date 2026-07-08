import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

const serviceLinks = [
  { href: "/services/accounting-bookkeeping", label: "Accounting & Bookkeeping" },
  { href: "/services/tax-declaration-advisory", label: "Tax Declaration" },
  { href: "/services/payroll-management", label: "Payroll Management" },
  { href: "/services/financial-statements", label: "Financial Statements" },
  { href: "/services/internal-audit", label: "Internal Audit" },
  { href: "/services/business-advisory", label: "Business Advisory" },
];

const companyLinks = [
  { href: "/about", label: "About Kivu Advisory" },
  { href: "/services", label: "Our Services" },
  { href: "/staff", label: "Our Staff" },
  { href: "/blog", label: "Blog & Insights" },
  { href: "/book-consultation", label: "Book Consultation" },
  { href: "/request-service", label: "Request a Service" },
  { href: "/contact", label: "Contact Us" },
];

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
    </svg>
  );
}

export function PublicFooter() {
  return (
    <>
      <footer className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center">
                <span className="text-2xl font-bold tracking-tight text-white">
                  Kivu Advisory
                </span>
                <span className="mb-3 ml-1 h-1.5 w-1.5 rounded-full bg-gold" />
              </div>

              <p className="mb-4 text-sm leading-relaxed text-gray-400">
                Professional accounting, tax, payroll, audit, and business
                advisory services for companies, NGOs, schools, and
                entrepreneurs.
              </p>

              <p className="mb-5 text-sm font-medium italic text-gold">
                Accuracy. Compliance. Growth.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                Company
              </h3>

              <ul className="space-y-2">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                Services
              </h3>

              <ul className="space-y-2">
                {serviceLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                Contact
              </h3>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Phone size={15} className="mt-0.5 shrink-0 text-teal" />
                  <span className="text-sm text-gray-400">0786196355</span>
                </li>

                <li className="flex items-start gap-3">
                  <MessageCircle
                    size={15}
                    className="mt-0.5 shrink-0 text-teal"
                  />
                  <a
                    href="https://wa.me/250786196355"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    WhatsApp: 0786196355
                  </a>
                </li>

                <li className="flex items-start gap-3">
                  <Mail size={15} className="mt-0.5 shrink-0 text-teal" />
                  <a
                    href="mailto:info@kivuadvisory.com"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    info@kivuadvisory.com
                  </a>
                </li>

                <li className="flex items-start gap-3">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-teal" />
                  <span className="text-sm text-gray-400">
                    Kigali, Rwanda
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <Clock size={15} className="mt-0.5 shrink-0 text-teal" />
                  <div>
                    <p className="text-sm text-gray-400">
                      Mon–Fri: 8:00 AM – 6:00 PM
                    </p>
                    <p className="text-sm text-gray-400">
                      Sat: 9:00 AM – 1:00 PM
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Kivu Advisory. All rights reserved.
            </p>

            <div className="flex items-center gap-5 text-xs text-gray-500">
              <Link
                href="/contact"
                className="transition-colors hover:text-gray-300"
              >
                Privacy Policy
              </Link>

              <Link
                href="/contact"
                className="transition-colors hover:text-gray-300"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/250786196355"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-lg transition-all hover:scale-110 hover:bg-teal-700"
        aria-label="Contact on WhatsApp"
      >
        <WhatsAppIcon />
      </a>
    </>
  );
}