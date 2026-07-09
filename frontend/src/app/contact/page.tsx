"use client";

import { FormEvent, useState } from "react";
import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { PublicLayout } from "@/components/layout/public-layout";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      toast.error("Please provide at least an email address or phone number.");
      return;
    }

    if (form.message.trim().length < 5) {
      toast.error("Please write a short message.");
      return;
    }

    setLoading(true);

    try {
      const preferredContactMethod = form.email.trim() ? "email" : "phone";

      const response = await fetch(`${apiBaseUrl}/consultations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          whatsapp: "",
          company_name: "",
          subject: "Contact form message",
          message: form.message,
          consultation_type: "general",
          preferred_contact_method: preferredContactMethod,
          preferred_date: null,
          preferred_time: "",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error?.message ||
            result?.message ||
            "Message could not be sent.",
        );
      }

      toast.success("Message sent! We will contact you shortly.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Message could not be sent. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <>
        {/* Hero */}
        <section className="bg-navy py-16 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal">
              Get In Touch
            </p>
            <h1 className="mb-5 text-4xl font-bold sm:text-5xl">Contact Us</h1>
            <p className="text-lg text-gray-400">
              We are ready to answer your questions and help you find the right
              service.
            </p>
          </div>
        </section>

        <section className="bg-softwhite py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Info */}
              <div>
                <h2 className="mb-6 text-2xl font-bold text-navy">
                  Get In Touch
                </h2>
                <p className="mb-8 leading-relaxed text-gray-600">
                  You can reach us by phone, WhatsApp, or email. You can also
                  visit our office during working hours. We are here to help.
                </p>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                      <Phone size={18} className="text-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">Phone</p>
                      <a
                        href="tel:0786196355"
                        className="text-gray-600 transition-colors hover:text-teal"
                      >
                        0786196355
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                      <MessageCircle size={18} className="text-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        WhatsApp
                      </p>
                      <a
                        href="https://wa.me/250786196355"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 transition-colors hover:text-teal"
                      >
                        0786196355 — Click to message
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                      <Mail size={18} className="text-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">Email</p>
                      <a
                        href="mailto:info@kivuadvisory.com"
                        className="text-gray-600 transition-colors hover:text-teal"
                      >
                        info@kivuadvisory.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                      <MapPin size={18} className="text-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        Office Location
                      </p>
                      <p className="text-gray-600">Kigali, Rwanda</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                      <Clock size={18} className="text-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        Working Hours
                      </p>
                      <p className="text-sm text-gray-600">
                        Monday – Friday: 8:00 AM – 6:00 PM
                      </p>
                      <p className="text-sm text-gray-600">
                        Saturday: 9:00 AM – 1:00 PM
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Closed on Sundays and public holidays
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-teal-100 bg-teal-50 p-5">
                  <p className="mb-1 text-sm font-semibold text-teal">
                    Prefer WhatsApp?
                  </p>
                  <p className="text-sm text-gray-600">
                    For quick responses, message us directly on WhatsApp. We
                    usually respond within a few hours during working hours.
                  </p>
                  <a
                    href="https://wa.me/250786196355"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    <MessageCircle size={16} /> Message on WhatsApp
                  </a>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <div className="rounded-2xl bg-lightgray p-8">
                  <h2 className="mb-6 text-xl font-bold text-navy">
                    Send Us a Message
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-charcoal">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                        placeholder="Jean Paul Habimana"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-charcoal">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm({ ...form, email: event.target.value })
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-charcoal">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(event) =>
                          setForm({ ...form, phone: event.target.value })
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                        placeholder="078 XXX XXXX"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-charcoal">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={(event) =>
                          setForm({ ...form, message: event.target.value })
                        }
                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                        placeholder="Describe how we can help you..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3.5 font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
                    >
                      <Send size={16} />
                      {loading ? "Sending..." : "Send Message"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    </PublicLayout>
  );
}