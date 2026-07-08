"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/forms/form-error";
import { PasswordRules } from "@/components/forms/password-rules";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage, isApiClientError } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { copyToClipboard } from "@/lib/utils";
import {
  createAccountantSchema,
  type CreateAccountantFormValues,
} from "@/lib/validators";
import type { AuthenticatedUser } from "@/types/api";

type CreatedCredentials = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
};

export function CreateAccountantForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorDetails, setServerErrorDetails] = useState<unknown>(null);
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountantFormValues>({
    resolver: zodResolver(createAccountantSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const watchedPassword = watch("password");

  const credentialText = useMemo(() => {
    if (!createdCredentials) return "";

    return [
      `Name: ${createdCredentials.full_name}`,
      `Email: ${createdCredentials.email}`,
      `Phone: ${createdCredentials.phone}`,
      `Password: ${createdCredentials.password}`,
      "Login page: /login",
    ].join("\n");
  }, [createdCredentials]);

  const handleCopy = async (label: string, value: string) => {
    const copied = await copyToClipboard(value);

    if (copied) {
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 1800);
    }
  };

  const onSubmit = async (values: CreateAccountantFormValues) => {
    setServerError(null);
    setServerErrorDetails(null);
    setCreatedCredentials(null);

    try {
      await api.post<AuthenticatedUser>(
        endpoints.auth.createAccountant,
        values,
      );

      setCreatedCredentials({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      reset({
        full_name: "",
        email: "",
        phone: "",
        password: "",
      });
    } catch (error) {
      setServerError(getApiErrorMessage(error));

      if (isApiClientError(error)) {
        setServerErrorDetails(error.details);
      }
    }
  };

  return (
    <div className="space-y-6">
      {createdCredentials ? (
        <Alert variant="success" title="Accountant account created">
          <div className="space-y-3">
            <p>
              The accountant account was created successfully. Share these
              credentials securely with the accountant.
            </p>

            <div className="rounded-lg border border-emerald-200 bg-white p-4 text-sm text-slate-800">
              <dl className="grid gap-3 md:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">Name</dt>
                  <dd className="mt-1">{createdCredentials.full_name}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-500">Email</dt>
                  <dd className="mt-1">{createdCredentials.email}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-500">Phone</dt>
                  <dd className="mt-1">{createdCredentials.phone}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-500">Temporary password</dt>
                  <dd className="mt-1 font-mono">
                    {createdCredentials.password}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("email", createdCredentials.email)}
                >
                  {copiedField === "email" ? "Email copied" : "Copy email"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy("password", createdCredentials.password)
                  }
                >
                  {copiedField === "password"
                    ? "Password copied"
                    : "Copy password"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("credentials", credentialText)}
                >
                  {copiedField === "credentials"
                    ? "Credentials copied"
                    : "Copy all credentials"}
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      ) : null}

      <FormError message={serverError || undefined} details={serverErrorDetails} />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Full name"
          placeholder="Accountant Name"
          autoComplete="name"
          required
          error={errors.full_name?.message}
          {...register("full_name")}
        />

        <Input
          label="Email address"
          type="email"
          placeholder="accountant@example.com"
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

        <Alert variant="warning" title="Credential handling">
          The password is shown only after successful creation so the admin can
          give it to the accountant. Share it securely and avoid sending
          credentials through unsafe channels.
        </Alert>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            Create accountant account
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() =>
              reset({
                full_name: "",
                email: "",
                phone: "",
                password: "",
              })
            }
          >
            Clear form
          </Button>
        </div>
      </form>
    </div>
  );
}