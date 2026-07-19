"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormError } from "@/components/forms/form-error";
import {
  api,
  getApiErrorMessage,
  isApiClientError,
  tokenStorage,
} from "@/lib/api";
import { getDashboardPathByRole } from "@/lib/auth";
import { endpoints } from "@/lib/endpoints";
import { useAuth } from "@/hooks/use-auth";
import type { TokenResponse } from "@/types/api";

const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorDetails, setServerErrorDetails] = useState<unknown>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setServerErrorDetails(null);

    try {
      const result = await api.post<TokenResponse>(endpoints.auth.login, values);

      tokenStorage.setAuth(result.data);
      setUser(result.data.user);

      const nextPath = searchParams.get("next");
      const fallbackPath = getDashboardPathByRole(result.data.user.role);

      router.replace(nextPath || fallbackPath);
    } catch (error) {
      setServerError(getApiErrorMessage(error));

      if (isApiClientError(error)) {
        setServerErrorDetails(error.details);
      }
    }
  };

  return (
    <div className="space-y-6">
      <FormError message={serverError || undefined} details={serverErrorDetails} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">
            Email Address
          </label>

          <input
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            {...register("email")}
          />

          {errors.email?.message ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">
            Password
          </label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-10 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              {...register("password")}
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errors.password?.message ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
        >
          {isSubmitting ? (
            "Logging in..."
          ) : (
            <>
              <span>Log In</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* <div className="border-t border-gray-100 pt-6 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-teal hover:underline"
          >
            Create Account
          </Link>
        </p>
      </div> */}
    </div>
  );
}
