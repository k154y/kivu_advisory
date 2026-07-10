"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";

import {
  ClientDetailCard,
  type AdminClientDetail,
} from "@/components/admin/client-detail-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<AdminClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadClient = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<AdminClientDetail>(
          endpoints.admin.clientDetail(params.id),
        );

        if (!cancelled) {
          setClient(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setClient(null);
          setError(
            getSafeErrorMessage(
              loadError,
              "This client record could not be loaded from the backend.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (params.id) {
      void loadClient();
    }

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Link href={routes.admin.clients}>
        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to clients
        </Button>
      </Link>

      {isLoading ? (
        <LoadingState
          title="Loading client"
          description="Preparing this client account profile."
        />
      ) : !client ? (
        <EmptyState
          title="Client unavailable"
          description={error || "This client could not be found."}
          icon={<Users className="h-5 w-5" />}
        />
      ) : (
        <ClientDetailCard client={client} />
      )}
    </div>
  );
}
