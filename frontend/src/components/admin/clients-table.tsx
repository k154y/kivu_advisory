"use client";

import Link from "next/link";
import { Calendar, Eye, Mail, UserCheck, UserX } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { formatDate, formatEmpty } from "@/lib/format";

export type AdminClientListItem = {
  id: string;
  full_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  is_active?: boolean;
  created_at?: string;
};

type ClientsTableProps = {
  clients: AdminClientListItem[];
};

export function ClientsTable({ clients }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <EmptyState
        title="No clients found"
        description="Client records will appear here when the backend returns data."
        icon={<UserX className="h-5 w-5" />}
      />
    );
  }

  return (
    <Table className="w-full text-sm">
      <TableHeader className="border-b border-gray-100 bg-lightgray">
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            Client
          </TableHead>
          <TableHead className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
            Email
          </TableHead>
          <TableHead className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
            Joined
          </TableHead>
          <TableHead className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            Status
          </TableHead>
          <TableHead className="px-5 py-3" />
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-gray-50 bg-white">
        {clients.map((client) => {
          const displayName =
            client.full_name || client.company_name || "Unnamed client";
          const isActive = client.is_active ?? true;

          return (
            <TableRow
              key={client.id}
              className="transition-colors hover:bg-lightgray/50"
            >
              <TableCell className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-navy">{displayName}</p>
                    <p className="text-xs text-gray-400 sm:hidden">
                      {formatEmpty(client.email)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden px-5 py-4 sm:table-cell">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Mail className="h-3 w-3 text-gray-400" />
                  {formatEmpty(client.email)}
                </div>
              </TableCell>
              <TableCell className="hidden px-5 py-4 md:table-cell">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  {formatDate(client.created_at)}
                </div>
              </TableCell>
              <TableCell className="px-5 py-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600",
                  )}
                >
                  {isActive ? (
                    <UserCheck className="h-3 w-3" />
                  ) : (
                    <UserX className="h-3 w-3" />
                  )}
                  {isActive ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell className="px-5 py-4">
                <Link
                  href={routes.admin.clientDetail(client.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-teal hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
