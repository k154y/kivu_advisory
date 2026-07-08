import Link from "next/link";

import { CreateAccountantForm } from "@/components/forms/create-accountant-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function CreateAccountantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Create Accountant Account"
        description="Create login credentials for an accountant who will access assigned client work through the accountant dashboard."
        actions={
          <Link
            href="/admin/accountants"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            Back to accountants
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>

          <CardContent>
            <CreateAccountantForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Alert variant="info" title="Backend endpoint used">
            This page uses the confirmed backend route{" "}
            <span className="font-mono">POST /api/v1/admin/accountants</span>.
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
            </CardHeader>

            <CardContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
                <li>The accountant account is created in the users table.</li>
                <li>The role is set to accountant by the backend.</li>
                <li>The admin shares credentials securely.</li>
                <li>The accountant logs in from the login page.</li>
                <li>
                  Assigned work will appear in the accountant dashboard when
                  assignment records exist.
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}