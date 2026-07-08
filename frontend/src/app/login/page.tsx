import Link from "next/link";

import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="hidden lg:block">
          <Link href="/" className="inline-block">
            <p className="text-2xl font-bold tracking-tight text-[#0F2742]">
              Kivu Advisory
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C99A35]">
              Professional accounting portal
            </p>
          </Link>

          <div className="mt-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C99A35]">
              Secure access
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Access your advisory workspace.
            </h1>

            <p className="mt-5 text-base leading-8 text-slate-600">
              Log in to manage service requests, documents, messages,
              consultations, and assigned accounting work.
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

            <CardTitle>Sign in</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Enter your email and password to access your dashboard.
            </p>
          </CardHeader>

          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}