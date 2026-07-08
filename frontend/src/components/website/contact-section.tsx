import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ContactSection() {
  return (
    <section className="bg-navy py-16">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Ready to Get Your Finances Organized?
        </h2>

        <p className="mb-8 text-lg leading-relaxed text-gray-400">
          Submit a service request today or book a consultation to discuss your
          accounting, tax, payroll, audit, and advisory needs.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/request-service"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-8 py-4 font-bold text-navy transition-colors hover:bg-gold-600"
          >
            Request a Service
            <ArrowRight size={18} />
          </Link>

          <Link
            href="/book-consultation"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-8 py-4 font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
          >
            Book a Consultation
          </Link>
        </div>
      </div>
    </section>
  );
}