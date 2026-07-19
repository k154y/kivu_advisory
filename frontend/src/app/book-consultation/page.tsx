"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { PublicLayout } from "@/components/layout/public-layout";

const SERVICES = [
  "Accounting and Bookkeeping",
  "Tax Declaration and Advisory",
  "Payroll Management",
  "Financial Statements",
  "Internal Audit",
  "Business Plan",
  "RRA Advisory",
  "RDB Services",
  "Business Advisory",
  "Other / Not sure",
];

const MEETING_METHODS = [
  { value: "phone", label: "Phone Call" },
  { value: "whatsapp", label: "WhatsApp Call" },
  { value: "physical", label: "Physical Meeting at Our Office" },
  { value: "online", label: "Online Meeting (Zoom / Google Meet)" },
];

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

type ConsultationFormState = {
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  service_type: string;
  preferred_date: string;
  preferred_time: string;
  meeting_method: string;
  message: string;
};

function getConsultationType(serviceType: string) {
  const value = serviceType.toLowerCase();

  if (value.includes("tax") || value.includes("rra")) {
    return "tax";
  }

  if (value.includes("accounting") || value.includes("bookkeeping")) {
    return "accounting";
  }

  if (value.includes("audit")) {
    return "audit";
  }

  if (value.includes("business")) {
    return "business_advisory";
  }

  if (value.includes("rdb")) {
    return "legal";
  }

  return "general";
}

function getPreferredContactMethod(meetingMethod: string) {
  if (meetingMethod === "whatsapp") {
    return "whatsapp";
  }

  return "phone";
}

function getMeetingMethodLabel(meetingMethod: string) {
  return (
    MEETING_METHODS.find((method) => method.value === meetingMethod)?.label ||
    meetingMethod
  );
}

function buildConsultationMessage(form: ConsultationFormState) {
  return [
    `Requested service/topic: ${form.service_type || "Not specified"}`,
    `Preferred meeting method: ${getMeetingMethodLabel(form.meeting_method)}`,
    "",
    "Additional message:",
    form.message || "No additional message provided.",
  ].join("\n");
}

export default function ConsultationPage() {
  const [form, setForm] = useState<ConsultationFormState>({
    full_name: "",
    company_name: "",
    phone: "",
    email: "",
    service_type: "",
    preferred_date: "",
    preferred_time: "",
    meeting_method: "phone",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof ConsultationFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm({
      full_name: "",
      company_name: "",
      phone: "",
      email: "",
      service_type: "",
      preferred_date: "",
      preferred_time: "",
      meeting_method: "phone",
      message: "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!form.phone.trim() && !form.email.trim()) {
      toast.error("Please provide at least phone or email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/consultations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name,
          company_name: form.company_name,
          phone: form.phone,
          email: form.email,
          whatsapp: form.meeting_method === "whatsapp" ? form.phone : "",
          subject: form.service_type || "Consultation request",
          message: buildConsultationMessage(form),
          consultation_type: getConsultationType(form.service_type),
          preferred_contact_method: getPreferredContactMethod(
            form.meeting_method,
          ),
          preferred_date: form.preferred_date || null,
          preferred_time: form.preferred_time,
          priority: "normal",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error?.message ||
            result?.message ||
            "Failed to book consultation.",
        );
      }

      setSubmitted(true);
      toast.success("Consultation booked!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to book consultation. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <PublicLayout>
        <section className="flex min-h-[70vh] items-center justify-center bg-lightgray py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <CheckCircle size={32} className="text-teal" />
            </div>

            <h1 className="mb-3 text-2xl font-bold text-navy">
              Consultation Booked!
            </h1>

            <p className="mb-8 leading-relaxed text-gray-600">
              Thank you for booking a consultation. Our team will confirm your
              appointment and contact you shortly.
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center rounded-lg border border-navy px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy-50"
              >
                Book another
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
              >
                Back to Home <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <>
        <section className="bg-navy py-12 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              Free Consultation
            </p>

            <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
              Book a Consultation
            </h1>

            <p className="text-gray-400">
              Not sure what service you need? Book a free consultation and we
              will guide you.
            </p>
          </div>
        </section>

        <section className="bg-lightgray py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-gray-100 bg-white p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-charcoal">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={form.full_name}
                      onChange={(event) =>
                        update("full_name", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                      placeholder="Your full name"
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
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-charcoal">
                      Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(event) => update("phone", event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                      placeholder="078 XXX XXXX"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-charcoal">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => update("email", event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Topic / Service Type
                  </label>
                  <select
                    value={form.service_type}
                    onChange={(event) =>
                      update("service_type", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  >
                    <option value="">What do you want to discuss?</option>
                    {SERVICES.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-charcoal">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={form.preferred_date}
                      onChange={(event) =>
                        update("preferred_date", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-charcoal">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      value={form.preferred_time}
                      onChange={(event) =>
                        update("preferred_time", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Meeting Method
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MEETING_METHODS.map((method) => (
                      <label
                        key={method.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          form.meeting_method === method.value
                            ? "border-teal bg-teal-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="meeting"
                          value={method.value}
                          checked={form.meeting_method === method.value}
                          onChange={() => update("meeting_method", method.value)}
                          className="accent-teal"
                        />
                        <span className="text-sm text-charcoal">
                          {method.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Additional Message
                  </label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(event) => update("message", event.target.value)}
                    className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Any additional information you want us to know before the consultation..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
                >
                  {loading ? (
                    "Booking..."
                  ) : (
                    <>
                      <span>Book Consultation</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </>
    </PublicLayout>
  );
}