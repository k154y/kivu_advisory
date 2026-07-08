"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { FormError } from "@/components/forms/form-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { api, getApiErrorMessage, isApiClientError } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  formatDateTime,
  formatEmailForDisplay,
  formatPhoneForDisplay,
} from "@/lib/format";
import type { PublicAccountant } from "@/types/api";

type AccountantDetailResponse =
  | PublicAccountant
  | {
      accountant?: PublicAccountant;
      item?: PublicAccountant;
      data?: PublicAccountant;
    };

const getAccountantFromResponse = (
  response: AccountantDetailResponse,
): PublicAccountant | null => {
  if ("id" in response) {
    return response;
  }

  if (response.accountant) {
    return response.accountant;
  }

  if (response.item) {
    return response.item;
  }

  if (response.data) {
    return response.data;
  }

  return null;
};

export default function AdminAccountantDetailPage() {
  const params = useParams<{ id: string }>();
  const accountantId = params.id;

  const [accountant, setAccountant] = useState<PublicAccountant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorDetails, setServerErrorDetails] = useState<unknown>(null);

  const loadAccountant = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);
    setServerErrorDetails(null);

    try {
      const result = await api.get<AccountantDetailResponse>(
        endpoints.admin.accountantAccountDetail(accountantId),
      );

      setAccountant(getAccountantFromResponse(result.data));
    } catch (error) {
      setServerError(getApiErrorMessage(error));

      if (isApiClientError(error)) {
        setServerErrorDetails(error.details);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accountantId]);

  useEffect(() => {
    void loadAccountant();
  }, [loadAccountant]);

  const updateStatus = async () => {
    if (!accountant) return;

    setIsUpdatingStatus(true);
    setServerError(null);
    setServerErrorDetails(null);
    setSuccessMessage(null);

    try {
      await api.patch<PublicAccountant>(
        endpoints.admin.accountantAccountStatus(accountant.id),
        {
          is_active: !accountant.is_active,
        },
      );

      setSuccessMessage(
        accountant.is_active
          ? "Accountant account deactivated successfully."
          : "Accountant account activated successfully.",
      );

      await loadAccountant();
    } catch (error) {
      setServerError(getApiErrorMessage(error));

      if (isApiClientError(error)) {
        setServerErrorDetails(error.details);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Loading accountant account"
        description="Please wait while we load the accountant details."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title={accountant?.full_name || "Accountant account"}
        description="View accountant account information and manage account access status."
        actions={
          <Link
            href="/admin/accountants"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2742] focus-visible:ring-offset-2"
          >
            Back to accountants
          </Link>
        }
      />

      {successMessage ? (
        <Alert variant="success" title="Status updated">
          {successMessage}
        </Alert>
      ) : null}

      <FormError
        message={serverError || undefined}
        details={serverErrorDetails}
      />

      {!accountant ? (
        <Alert variant="warning" title="Accountant not found">
          The accountant account could not be loaded. Confirm that the account
          exists and that the backend detail endpoint is working.
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Account information</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-5 md:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Full name
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {accountant.full_name}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-slate-500">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge type="active" value={accountant.is_active} />
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Email address
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {formatEmailForDisplay(accountant.email)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Phone number
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {formatPhoneForDisplay(accountant.phone)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Last login
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {formatDateTime(accountant.last_login_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Created
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {formatDateTime(accountant.created_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Updated
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {formatDateTime(accountant.updated_at)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Access control</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  Deactivating the account should prevent the accountant from
                  accessing the accountant dashboard if the backend checks active
                  status during authentication and authorization.
                </p>

                <Button
                  type="button"
                  variant={accountant.is_active ? "danger" : "success"}
                  isLoading={isUpdatingStatus}
                  onClick={() => void updateStatus()}
                >
                  {accountant.is_active
                    ? "Deactivate account"
                    : "Activate account"}
                </Button>
              </CardContent>
            </Card>

            <Alert variant="info" title="Assigned work">
              Assigned work will be shown from the assignment module after we
              connect accountant assignments.
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
}