"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  api,
  getApiErrorMessage,
  isApiClientError,
  tokenStorage,
} from "@/lib/api";
import { getDashboardPathByRole } from "@/lib/auth";
import { endpoints } from "@/lib/endpoints";
import type { AuthenticatedUser, TokenResponse } from "@/types/api";

const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

type TokenStorageWriter = typeof tokenStorage & {
  setAccessToken?: (token: string) => void;
  setRefreshToken?: (token: string) => void;
  setUser?: (user: AuthenticatedUser) => void;
  setTokens?: (...args: unknown[]) => void;
  setSession?: (...args: unknown[]) => void;
};

const saveLoginSession = (tokenResponse: TokenResponse) => {
  const storage = tokenStorage as TokenStorageWriter;

  storage.setTokens?.(tokenResponse);
  storage.setSession?.(tokenResponse);

  storage.setAccessToken?.(tokenResponse.access_token);
  storage.setRefreshToken?.(tokenResponse.refresh_token);
  storage.setUser?.(tokenResponse.user);
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorDetails, setServerErrorDetails] = useState<unknown>(null);

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
      const result = await api.post<TokenResponse>(
        endpoints.auth.login,
        values,
      );

      saveLoginSession(result.data);

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
      <FormError
        message={serverError || undefined}
        details={serverErrorDetails}
      />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="text-center text-sm text-slate-600">
        Do not have a client account?{" "}
        <Link
          href="/register"
          className="font-medium text-[#0F2742] underline-offset-4 hover:underline"
        >
          Create one here
        </Link>
      </div>
    </div>
  );
}