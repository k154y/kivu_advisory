import Link from "next/link";
import { ArrowLeft, CheckCircle, UserPlus } from "lucide-react";

import { RegisterForm } from "@/components/forms/register-form";

const benefits = [
  "Submit and track service requests",
  "Upload documents securely",
  "Exchange messages with the advisory team",
  "Follow progress from one organized portal",
];

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-lightgray">
      <div className="grid min-h-screen lg:grid-cols-[520px_minmax(0,1fr)]">
        <section className="hidden bg-navy text-white lg:block">
          <div className="flex min-h-screen flex-col justify-between p-12">
            <Link href="/" className="inline-flex items-center">
              <span className="text-2xl font-bold tracking-tight">
                Kivu Advisory
              </span>
              
            </Link>

            <div>
              {/* <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
                Client Portal
              </p> */}

              <h1 className="mb-5 text-4xl font-bold leading-tight">
                Create your client account and manage services easily.
              </h1>

              <p className="mb-8 leading-relaxed text-white/75">
                Register to access a secure workflow for service requests,
                documents, messages, and progress tracking.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-teal" />
                    <p className="text-sm leading-relaxed text-white/75">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-white/50">
              Professional accounting, tax, payroll, audit, and advisory
              services.
            </p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-2xl">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-navy"
            >
              <ArrowLeft size={16} />
              Back to website
            </Link>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white">
                <UserPlus size={26} />
              </div>

              <h1 className="text-3xl font-bold text-navy">
                Create account
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Register to access the Kivu Advisory client portal.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-softwhite p-6 shadow-sm sm:p-8">
              <RegisterForm />
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-teal transition-colors hover:text-teal-700"
              >
                Log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}