"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, Lock, Upload } from "lucide-react";
import { toast } from "sonner";

import { PublicLayout } from "@/components/layout/public-layout";

const SERVICES = [
  { value: "accounting-bookkeeping", label: "Accounting and Bookkeeping" },
  { value: "tax-declaration-advisory", label: "Tax Declaration and Advisory" },
  { value: "payroll-management", label: "Payroll Management" },
  { value: "financial-statements", label: "Financial Statement Preparation" },
  { value: "internal-audit", label: "Internal Audit" },
  { value: "business-plan", label: "Business Plan Preparation" },
  { value: "rra-advisory", label: "RRA Advisory and Compliance" },
  { value: "rdb-services", label: "RDB Services and Registration" },
  { value: "budget-preparation", label: "Budget Preparation and Planning" },
  { value: "accounting-software-setup", label: "Accounting Software Setup" },
  { value: "training-accounting-tax", label: "Training in Accounting and Tax" },
  { value: "business-advisory", label: "Business Advisory Services" },
  { value: "other", label: "Other" },
];

const URGENCY = [
  { value: "low", label: "Low — Not urgent" },
  { value: "normal", label: "Normal — Within a week" },
  { value: "high", label: "High — Within 2–3 days" },
  { value: "urgent", label: "Urgent — ASAP" },
];

const CONTACT_METHODS = [
  { value: "phone", label: "Phone Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

type RequestFormState = {
  full_name: string;
  company_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  service_type: string;
  urgency: string;
  description: string;
  contact_method: string;
};

function buildRequestDescription(form: RequestFormState) {
  const selectedService =
    SERVICES.find((service) => service.value === form.service_type)?.label ||
    form.service_type ||
    "Not specified";

  return [
    `Service needed: ${selectedService}`,
    `Urgency: ${form.urgency}`,
    `Preferred contact method: ${form.contact_method}`,
    form.location ? `Location / District: ${form.location}` : "",
    form.whatsapp ? `WhatsApp number: ${form.whatsapp}` : "",
    "",
    "Client description:",
    form.description,
  ]
    .filter(Boolean)
    .join("\n");
}

function RequestServiceLoading() {
  return (
    <section className="flex min-h-[50vh] items-center justify-center bg-lightgray py-20">
      <p className="text-sm font-medium text-gray-600">Loading form...</p>
    </section>
  );
}

export default function RequestServicePage() {
  return (
    <PublicLayout>
      <Suspense fallback={<RequestServiceLoading />}>
        <RequestForm />
      </Suspense>
    </PublicLayout>
  );
}

function RequestForm() {
  const searchParams = useSearchParams();

  const serviceFromURL = searchParams.get("service") || "";
  const normalizedServiceFromURL = serviceFromURL.replace(/-/g, " ");

  const matchedService = serviceFromURL
    ? SERVICES.find(
        (service) =>
          service.value === serviceFromURL ||
          service.label.toLowerCase().includes(normalizedServiceFromURL),
      )
    : undefined;

  const [form, setForm] = useState<RequestFormState>({
    full_name: "",
    company_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    location: "",
    service_type: matchedService?.value ?? "",
    urgency: "normal",
    description: "",
    contact_method: "phone",
  });

  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: keyof RequestFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setSubmitted(false);
    setReferenceNumber("");
    setForm({
      full_name: "",
      company_name: "",
      phone: "",
      whatsapp: "",
      email: "",
      location: "",
      service_type: "",
      urgency: "normal",
      description: "",
      contact_method: "phone",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!form.email.trim() && !form.phone.trim() && !form.whatsapp.trim()) {
      toast.error("Please provide at least phone, WhatsApp, or email.");
      return;
    }

    if (!form.service_type) {
      toast.error("Please select the service you need.");
      return;
    }

    if (form.description.trim().length < 5) {
      toast.error("Please describe what you need.");
      return;
    }

    setLoading(true);

    try {
      const selectedService =
        SERVICES.find((service) => service.value === form.service_type)?.label ||
        "Service request";

      const requesterPhone = form.phone.trim() || form.whatsapp.trim();

      const response = await fetch(`${apiBaseUrl}/service-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requester_name: form.full_name,
          requester_email: form.email,
          requester_phone: requesterPhone,
          requester_company: form.company_name,
          title: `Request for ${selectedService}`,
          description: buildRequestDescription(form),
          priority: form.urgency,
          preferred_contact_method: form.contact_method,
          source: "website",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error?.message ||
            result?.message ||
            "Failed to submit request.",
        );
      }

      const reference =
        result?.data?.reference_number ||
        result?.data?.item?.reference_number ||
        result?.data?.service_request?.reference_number ||
        "";

      setReferenceNumber(reference);
      setSubmitted(true);
      toast.success("Request submitted successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-lightgray py-20">
        <div className="mx-auto max-w-lg px-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <CheckCircle size={32} className="text-teal" />
          </div>

          <h1 className="mb-3 text-2xl font-bold text-navy">
            Request Submitted!
          </h1>

          <p className="mb-3 leading-relaxed text-gray-600">
            Thank you. Your service request has been received. Our team will
            review it and contact you shortly.
          </p>

          {referenceNumber ? (
            <p className="mb-6 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-navy">
              Reference number: {referenceNumber}
            </p>
          ) : null}

          <div className="mb-6 rounded-xl border border-navy/10 bg-navy-50 p-5 text-left">
            <div className="mb-2 flex items-center gap-3">
              <Lock size={16} className="shrink-0 text-navy" />
              <p className="text-sm font-semibold text-navy">
                Upload Documents &amp; Track Progress
              </p>
            </div>

            <p className="mb-3 text-sm text-gray-600">
              Create an account or log in to upload supporting documents and
              follow the status of your request in real time.
            </p>

            <div className="flex gap-2">
              <Link
                href="/register"
                className="flex-1 rounded-lg bg-navy py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-navy-700"
              >
                Create Account
              </Link>

              <Link
                href="/login"
                className="flex-1 rounded-lg border border-navy py-2.5 text-center text-sm font-semibold text-navy transition-colors hover:bg-navy-50"
              >
                Log In
              </Link>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 underline hover:text-navy"
            >
              Submit another request
            </button>

            <Link
              href="/"
              className="text-sm font-semibold text-navy hover:underline"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
            Get Started
          </p>

          <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
            Request a Service
          </h1>

          <p className="text-gray-400">
            Fill in the form below and we will get back to you within 24 hours.
          </p>
        </div>
      </section>

      <section className="bg-lightgray py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Upload size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Document uploads require an account
              </p>

              <p className="mt-0.5 text-xs text-amber-700">
                You can submit this request without logging in. To upload
                supporting documents and track your request,{" "}
                <Link href="/login" className="underline">
                  log in
                </Link>{" "}
                or{" "}
                <Link href="/register" className="underline">
                  create an account
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(event) =>
                      update("full_name", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Jean Paul Habimana"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={(event) =>
                      update("company_name", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Company Ltd or NGO Name"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="078 XXX XXXX"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(event) => update("whatsapp", event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="078 XXX XXXX"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Location / District
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Kigali, Gasabo"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Service Needed *
                </label>
                <select
                  required
                  value={form.service_type}
                  onChange={(event) =>
                    update("service_type", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="">Select a service...</option>
                  {SERVICES.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Urgency Level
                  </label>
                  <select
                    value={form.urgency}
                    onChange={(event) => update("urgency", event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  >
                    {URGENCY.map((urgency) => (
                      <option key={urgency.value} value={urgency.value}>
                        {urgency.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Preferred Contact Method
                  </label>
                  <select
                    value={form.contact_method}
                    onChange={(event) =>
                      update("contact_method", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  >
                    {CONTACT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Description of Your Need *
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  placeholder="Please describe what you need help with, your business situation, and any relevant details..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
              >
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <span>Submit Request</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}