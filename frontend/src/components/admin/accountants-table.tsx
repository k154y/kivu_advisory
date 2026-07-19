"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FormError } from "@/components/forms/form-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, getApiErrorMessage, isApiClientError } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  formatDateTime,
  formatEmailForDisplay,
  formatPhoneForDisplay,
} from "@/lib/format";
import type { PublicAccountant } from "@/types/api";

type AccountantListResponse =
  | PublicAccountant[]
  | {
      items?: PublicAccountant[];
      accountants?: PublicAccountant[];
      data?: PublicAccountant[];
    };

const getAccountantsFromResponse = (
  response: AccountantListResponse,
): PublicAccountant[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.accountants)) {
    return response.accountants;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

export function AccountantsTable() {
  const [accountants, setAccountants] = useState<PublicAccountant[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorDetails, setServerErrorDetails] = useState<unknown>(null);

  const activeValue = useMemo(() => {
    if (activeFilter === "active") return true;
    if (activeFilter === "inactive") return false;
    return undefined;
  }, [activeFilter]);

  const loadAccountants = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);
    setServerErrorDetails(null);

    try {
      const result = await api.get<AccountantListResponse>(
        endpoints.admin.accountantAccounts({
          search: search.trim() || undefined,
          is_active: activeValue,
          page: 1,
          page_size: 50,
        }),
      );

      setAccountants(getAccountantsFromResponse(result.data));
    } catch (error) {
      setServerError(getApiErrorMessage(error));

      if (isApiClientError(error)) {
        setServerErrorDetails(error.details);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeValue, search]);

  useEffect(() => {
    void loadAccountants();
  }, [loadAccountants]);

  const updateStatus = async (accountant: PublicAccountant) => {
    setIsUpdatingId(accountant.id);
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

      await loadAccountants();
    } catch (error) {
      setServerError(getApiErrorMessage(error));

      if (isApiClientError(error)) {
        setServerErrorDetails(error.details);
      }
    } finally {
      setIsUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {successMessage ? (
        <Alert variant="success" title="Status updated">
          {successMessage}
        </Alert>
      ) : null}

      <FormError
        message={serverError || undefined}
        details={serverErrorDetails}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-end md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            label="Search"
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Select
            label="Status"
            value={activeFilter}
            onChange={(event) =>
              setActiveFilter(
                event.target.value as "all" | "active" | "inactive",
              )
            }
            options={[
              { label: "All accounts", value: "all" },
              { label: "Active only", value: "active" },
              { label: "Inactive only", value: "inactive" },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadAccountants()}
          >
            Refresh
          </Button>

          <Link
            href="/admin/accountants/create"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2742] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#16385D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2742] focus-visible:ring-offset-2"
          >
            Create accountant
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingState
          title="Loading accountant accounts"
          description="Please wait while we load the accountant list."
        />
      ) : accountants.length === 0 ? (
        <EmptyState
          title="No accountant accounts found"
          description="Create an accountant account so assigned work can be managed from the accountant dashboard."
          action={
            <Link
              href="/admin/accountants/create"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2742] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#16385D]"
            >
              Create accountant
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accountants.map((accountant) => (
                <TableRow key={accountant.id}>
                  <TableCell className="font-medium text-slate-950">
                    {accountant.full_name}
                  </TableCell>

                  <TableCell>
                    {formatEmailForDisplay(accountant.email)}
                  </TableCell>

                  <TableCell>
                    {formatPhoneForDisplay(accountant.phone)}
                  </TableCell>

                  <TableCell>
                    <StatusBadge type="active" value={accountant.is_active} />
                  </TableCell>

                  <TableCell>
                    {formatDateTime(accountant.last_login_at)}
                  </TableCell>

                  <TableCell>{formatDateTime(accountant.created_at)}</TableCell>

                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/accountants/${accountant.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                      >
                        View
                      </Link>

                      <Button
                        type="button"
                        size="sm"
                        variant={accountant.is_active ? "danger" : "success"}
                        isLoading={isUpdatingId === accountant.id}
                        onClick={() => void updateStatus(accountant)}
                      >
                        {accountant.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}