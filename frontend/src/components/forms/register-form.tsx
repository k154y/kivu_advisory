"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormError } from "@/components/forms/form-error";
import { PasswordRules } from "@/components/forms/password-rules";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage, isApiClientError } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

const strongPasswordSchema = z
  .string()
  .min(10, "Password must have at least 10 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

const registerFormSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required."),
  company_name: z.string().trim().min(2, "Company name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(5, "Phone number is required."),
  whatsapp: z.string().trim().optional(),
  location: z.string().trim().min(2, "Location is required."),
  password: strongPasswordSchema,
  accept_terms: z.boolean().refine((value) => value, {
    message: "You must accept the terms before registering.",
  }),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm() {
  const router = useRouter();

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorDetails, setServerErrorDetails] = useState<unknown>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      full_name: "",
      company_name: "",
      email: "",
      phone: "",
      whatsapp: "",
      location: "",
      password: "",
      accept_terms: false,
    },
  });

  const watchedPassword = watch("password");

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setServerErrorDetails(null);
    setSuccessMessage(null);

    try {
      await api.post(endpoints.auth.register, {
        ...values,
        whatsapp: values.whatsapp || "",
      });

      setSuccessMessage(
        "Your client account was created successfully. You can now log in.",
      );

      reset();

      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error) {
      setServerError(getApiErrorMessage(error));

      if (isApiClientError(error)) {
        setServerErrorDetails(error.details);
      }
    }
  };

  return (
    <div className="space-y-6">
      {successMessage ? (
        <Alert variant="success" title="Registration successful">
          {successMessage}
        </Alert>
      ) : null}

      <FormError
        message={serverError || undefined}
        details={serverErrorDetails}
      />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label="Full name"
            placeholder="Your full name"
            autoComplete="name"
            required
            error={errors.full_name?.message}
            {...register("full_name")}
          />

          <Input
            label="Company name"
            placeholder="Company or organization"
            autoComplete="organization"
            required
            error={errors.company_name?.message}
            {...register("company_name")}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label="Email address"
            type="email"
            placeholder="client@example.com"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Phone number"
            placeholder="+250788000000"
            autoComplete="tel"
            required
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label="WhatsApp number"
            placeholder="+250788000000"
            autoComplete="tel"
            error={errors.whatsapp?.message}
            {...register("whatsapp")}
          />

          <Input
            label="Location"
            placeholder="Rubavu, Rwanda"
            autoComplete="address-level2"
            required
            error={errors.location?.message}
            {...register("location")}
          />
        </div>

        <Input
          label="Password"
          type="password"
          placeholder="StrongPassword2026!"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <PasswordRules password={watchedPassword} />

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0F2742] focus:ring-[#0F2742]"
            {...register("accept_terms")}
          />

          <span>
            I confirm that the information provided is correct and I accept the
            use of this portal for professional advisory service management.
          </span>
        </label>

        {errors.accept_terms?.message ? (
          <p className="text-sm text-red-600">{errors.accept_terms.message}</p>
        ) : null}

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Create client account
        </Button>
      </form>

      <div className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[#0F2742] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}