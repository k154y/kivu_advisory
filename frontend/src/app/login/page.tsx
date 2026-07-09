import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-lightgray px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-navy"
        >
          <ArrowLeft size={16} />
          Back to website
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy">
              <span className="text-lg font-bold text-white">K</span>
            </div>

            <h1 className="text-2xl font-bold text-navy">
              Log In to Kivu Advisory
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Access your client portal or admin dashboard
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-teal hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}