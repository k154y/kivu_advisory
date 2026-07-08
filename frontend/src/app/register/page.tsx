import Link from "next/link";

import { RegisterForm } from "@/components/forms/register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_560px]">
        <section className="hidden lg:block">
          <Link href="/" className="inline-block">
            <p className="text-2xl font-bold tracking-tight text-[#0F2742]">
              Kivu Advisory
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C99A35]">
              Client portal registration
            </p>
          </Link>

          <div className="mt-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C99A35]">
              Start professionally
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Create your client account.
            </h1>

            <p className="mt-5 text-base leading-8 text-slate-600">
              Use your client portal to request services, upload documents,
              communicate securely, and follow the progress of your work.
            </p>
          </div>
        </section>

        <Card className="w-full">
          <CardHeader>
            <div className="mb-4 lg:hidden">
              <Link href="/" className="inline-block">
                <p className="text-xl font-bold tracking-tight text-[#0F2742]">
                  Kivu Advisory
                </p>
              </Link>
            </div>

            <CardTitle>Create client account</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Complete the form below to create your client portal account.
            </p>
          </CardHeader>

          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}