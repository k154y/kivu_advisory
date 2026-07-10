"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FolderKanban } from "lucide-react";

import {
  AccountantAssignmentDetail,
  type AccountantAssignmentDetail as AccountantAssignmentDetailType,
} from "@/components/accountant/accountant-assignment-detail";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";

export default function AccountantAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<AccountantAssignmentDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAssignment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<AccountantAssignmentDetailType>(
          endpoints.accountant.assignmentDetail(params.id),
        );

        if (!cancelled) {
          setAssignment(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAssignment(null);
          setError(
            getSafeErrorMessage(
              loadError,
              "This assignment could not be loaded from the backend.",
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
      void loadAssignment();
    }

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Link href={routes.accountant.assignedWork}>
        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to assigned work
        </Button>
      </Link>

      {isLoading ? (
        <LoadingState
          title="Loading assignment"
          description="Fetching assignment details and progress information."
        />
      ) : !assignment ? (
        <EmptyState
          title="Assignment unavailable"
          description={error || "This assignment could not be found."}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      ) : (
        <AccountantAssignmentDetail assignment={assignment} onUpdated={setAssignment} />
      )}
    </div>
  );
}
