"use client";

import { useState } from "react";
import {
  AlertTriangle,
  FileQuestion,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

type AdminRequestClientDocumentUploadCardProps = {
  serviceRequestId: string;
  referenceNumber?: string;
};

type Urgency = "normal" | "high" | "urgent";

const DEFAULT_MESSAGE =
  "Please upload this document so we can continue reviewing your request.";

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getFriendlyErrorMessage(error: unknown) {
  const message = getSafeErrorMessage(
    error,
    "Failed to send client document upload request.",
  );

  if (
    message
      .toLowerCase()
      .includes("this service request is not linked to a client account with an email")
  ) {
    return "This request is not linked to a client account yet. The client must register/login and claim the request before you can request documents.";
  }

  return message;
}

export function AdminRequestClientDocumentUploadCard({
  serviceRequestId,
  referenceNumber,
}: AdminRequestClientDocumentUploadCardProps) {
  const [open, setOpen] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setDocumentName("");
    setMessage(DEFAULT_MESSAGE);
    setUrgency("normal");
  };

  const handleSubmit = async () => {
    const cleanDocumentName = documentName.trim();
    const cleanMessage = message.trim();

    if (!cleanDocumentName) {
      toast.error("Document name is required.");
      return;
    }

    if (!serviceRequestId) {
      toast.error("Service request ID is missing.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post(endpoints.adminDocumentRequests.requestClientUpload(), {
        service_request_id: serviceRequestId,
        document_name: cleanDocumentName,
        message: cleanMessage || DEFAULT_MESSAGE,
        urgency,
      });

      toast.success("Client document upload request sent successfully.");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="rounded-xl border border-gold/30 bg-gold/10 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-navy">
              <FileQuestion size={20} />
            </div>

            <div>
              <h3 className="font-bold text-navy">
                Request client document
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
                Ask the client to upload a missing document for{" "}
                <span className="font-semibold">
                  {referenceNumber || "this request"}
                </span>
                . This does not upload a file. It sends an in-app notification,
                email, and SMS according to backend rules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal"
          >
            <Send size={15} />
            Request document
          </button>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-navy">
                  Request client document
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  The client will receive a notification and upload the document
                  later.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-lightgray hover:text-navy"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <div className="flex gap-2">
                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <p className="text-xs leading-relaxed text-amber-700">
                    This form only asks the client to upload a document. It does
                    not upload or attach a file from the admin side.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">
                  Required document name
                </label>

                <input
                  type="text"
                  value={documentName}
                  onChange={(event) => setDocumentName(event.target.value)}
                  placeholder="Tax registration certificate"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">
                  Message
                </label>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">
                  Urgency
                </label>

                <select
                  value={urgency}
                  onChange={(event) => setUrgency(event.target.value as Urgency)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm capitalize focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="normal">normal</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !documentName.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                Send request
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}