"use client";

import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type RevealPasswordButtonProps = {
  credentialId: string;
  revealEndpoint: string;
};

function getData(response: unknown): Record<string, unknown> {
  if (!response || typeof response !== "object") return {};

  const objectResponse = response as {
    data?: unknown;
    password?: string;
  };

  if (objectResponse.data && typeof objectResponse.data === "object") {
    const nested = objectResponse.data as {
      data?: unknown;
      password?: string;
    };

    if (nested.data && typeof nested.data === "object") {
      return nested.data as Record<string, unknown>;
    }

    return nested as Record<string, unknown>;
  }

  return objectResponse as Record<string, unknown>;
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function RevealPasswordButton({
  credentialId,
  revealEndpoint,
}: RevealPasswordButtonProps) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    return () => {
      setPassword("");
    };
  }, []);

  const reveal = async () => {
    setLoading(true);

    try {
      const result = await api.post<unknown>(
        `${revealEndpoint}?id=${encodeURIComponent(credentialId)}`,
        {},
      );

      const data = getData(result.data);
      const revealedPassword =
        typeof data.password === "string" ? data.password : "";

      if (!revealedPassword) {
        toast.error("Password was not returned by the server.");
        return;
      }

      setPassword(revealedPassword);
      toast.success("Password revealed.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to reveal password."));
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!password) return;

    await navigator.clipboard.writeText(password);
    toast.success("Password copied.");
  };

  if (password) {
    return (
      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="truncate font-mono text-sm font-semibold text-amber-800">
            {password}
          </p>

          <button
            type="button"
            onClick={() => setPassword("")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-navy"
          >
            <EyeOff size={13} />
            Hide
          </button>
        </div>

        <button
          type="button"
          onClick={copyPassword}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal"
        >
          <Copy size={13} />
          Copy password
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={reveal}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
      Reveal
    </button>
  );
}