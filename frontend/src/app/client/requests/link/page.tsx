"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

type ClaimFormState = {
  reference_number: string;
  requester_email: string;
  requester_phone: string;
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getFriendlyClaimError(error: unknown) {
  const message = getSafeErrorMessage(
    error,
    "We could not link this request. Please check the reference number and the email or phone number used when you submitted the request.",
  );

  const lower = message.toLowerCase();

  if (
    lower.includes("email") &&
    lower.includes("phone") &&
    lower.includes("required")
  ) {
    return "Please enter the original email or phone number used for this request.";
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("authentication") ||
    lower.includes("token")
  ) {
    return "Please log in as a client to link an existing request.";
  }

  if (
    lower.includes("not found") ||
    lower.includes("cannot be claimed") ||
    lower.includes("already linked") ||
    lower.includes("forbidden")
  ) {
    return "We could not link this request. Please check the reference number and the email or phone number used when you submitted the request.";
  }

  return message;
}

export default function LinkExistingRequestPage() {
  const router = useRouter();

  const [form, setForm] = useState<ClaimFormState>({
    reference_number: "",
    requester_email: "",
    requester_phone: "",
  });

  const [loading, setLoading] = useState(false);

  const update = (field: keyof ClaimFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const referenceNumber = form.reference_number.trim().toUpperCase();
    const requesterEmail = form.requester_email.trim();
    const requesterPhone = form.requester_phone.trim().replace(/\s+/g, "");

    if (!referenceNumber) {
      toast.error("Reference number is required.");
      return;
    }

    if (!requesterEmail && !requesterPhone) {
      toast.error(
        "Please enter the original email or phone number used for this request.",
      );
      return;
    }

    const payload: {
      reference_number: string;
      requester_email?: string;
      requester_phone?: string;
    } = {
      reference_number: referenceNumber,
    };

    if (requesterEmail) {
      payload.requester_email = requesterEmail;
    }

    if (requesterPhone) {
      payload.requester_phone = requesterPhone;
    }

    setLoading(true);

    try {
      await api.post("/client/service-requests/claim", payload);

      toast.success("Service request linked to your account successfully.");
      router.push(routes.client.requests);
      router.refresh();
    } catch (error) {
      toast.error(getFriendlyClaimError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <Link
          href={routes.client.requests}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-navy"
        >
          <ArrowLeft size={16} />
          Back to My Requests
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-gold">
              Service Requests
            </p>

            <h1 className="text-2xl font-bold text-navy">
              Link Existing Request
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Link a service request you submitted before creating your client
              account.
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-navy">
            <LinkIcon size={22} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal">
                Reference Number *
              </label>

              <input
                type="text"
                value={form.reference_number}
                onChange={(event) =>
                  update("reference_number", event.target.value)
                }
                placeholder="Example: SR-27D7AF85"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm uppercase focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              />

              <p className="mt-1 text-xs text-gray-400">
                Enter the reference number shown after you submitted your
                public request.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal">
                Original Email Used on Request
              </label>

              <input
                type="email"
                value={form.requester_email}
                onChange={(event) =>
                  update("requester_email", event.target.value)
                }
                placeholder="oldemail@example.com"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal">
                Original Phone Used on Request
              </label>

              <input
                type="tel"
                value={form.requester_phone}
                onChange={(event) =>
                  update("requester_phone", event.target.value)
                }
                placeholder="+250788000000"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              />

              <p className="mt-1 text-xs text-gray-400">
                Email and phone are optional individually, but at least one is
                required.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                To protect your information, the reference number alone is not
                enough. Please also provide the email or phone number used when
                the request was created.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} />
                    Link Request
                  </>
                )}
              </button>

              <Link
                href={routes.client.requests}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-lightgray"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <aside className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal">
            <CheckCircle size={22} />
          </div>

          <h2 className="font-bold text-navy">When should you use this?</h2>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Use this page if you submitted a service request before creating
            your account, especially if the request used a different email.
          </p>

          <div className="mt-5 space-y-3 text-sm text-gray-500">
            <p>
              <span className="font-semibold text-charcoal">Same email:</span>{" "}
              your request should appear automatically.
            </p>

            <p>
              <span className="font-semibold text-charcoal">
                Different email:
              </span>{" "}
              use the reference number and original email or phone to link it.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}