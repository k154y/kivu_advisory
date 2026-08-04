"use client";

import { useState, type FormEvent } from "react";
import { FileQuestion, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

type AdminRequestClientDocumentUploadCardProps = {
  serviceRequestId: string;
  referenceNumber?: string;
};

type Urgency = "normal" | "high" | "urgent";

type FormState = {
  document_name: string;
  message: string;
  urgency: Urgency;
};

const urgencyOptions: { value: Urgency; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AdminRequestClientDocumentUploadCard({
  serviceRequestId,
  referenceNumber,
}: AdminRequestClientDocumentUploadCardProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState<FormState>({
    document_name: "",
    message:
      "Please upload this document so we can continue reviewing your request.",
    urgency: "high",
  });

  const updateForm = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      document_name: "",
      message:
        "Please upload this document so we can continue reviewing your request.",
      urgency: "high",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const documentName = form.document_name.trim();
    const message = form.message.trim();

    if (!serviceRequestId) {
      toast.error("Service request ID is missing.");
      return;
    }

    if (!documentName) {
      toast.error("Please enter the document name.");
      return;
    }

    if (!message) {
      toast.error("Please enter the message to send.");
      return;
    }

    setSending(true);

    try {
      await api.post(endpoints.adminDocumentRequests.requestClientUpload(), {
        service_request_id: serviceRequestId,
        document_name: documentName,
        message,
        urgency: form.urgency,
      });

      toast.success("Document request sent successfully.");

      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to send document request."),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gold/30 bg-gold/10 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-navy shadow-sm">
            <FileQuestion className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-navy">
              Request client document
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Ask the client or requester to upload a missing document
              {referenceNumber ? ` for ${referenceNumber}` : ""}.
            </p>

            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              If the request is linked to a client account, the backend will
              send in-app notification plus email/SMS. If it is not linked, the
              backend will send email/SMS to the requester contact details.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal"
        >
          <Send className="h-4 w-4" />
          Request document
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-navy">
                  Request client document
                </h3>

                <p className="text-sm text-gray-500">
                  {referenceNumber || "Service request"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-lightgray hover:text-navy"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">
                  Document name *
                </label>

                <input
                  type="text"
                  value={form.document_name}
                  onChange={(event) =>
                    updateForm("document_name", event.target.value)
                  }
                  placeholder="Tax registration certificate"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">
                  Message *
                </label>

                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(event) => updateForm("message", event.target.value)}
                  className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">
                  Urgency
                </label>

                <select
                  value={form.urgency}
                  onChange={(event) =>
                    updateForm("urgency", event.target.value as Urgency)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal/30"
                >
                  {urgencyOptions.map((urgency) => (
                    <option key={urgency.value} value={urgency.value}>
                      {urgency.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-lightgray px-4 py-3 text-xs leading-relaxed text-gray-500">
                This sends the request to the backend endpoint{" "}
                <span className="font-semibold text-navy">
                  /admin/documents/request-upload
                </span>
                . Client account is not required.
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={sending}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}