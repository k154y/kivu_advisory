"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lock, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type ProfileFormProps = {
  accentColor?: string;
};

type ProfileData = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

type ProfileState = {
  full_name: string;
  email: string;
  phone: string;
};

type PasswordState = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const emptyProfile: ProfileState = {
  full_name: "",
  email: "",
  phone: "",
};

const emptyPassword: PasswordState = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getProfileFromResponse(response: unknown): ProfileData | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const objectResponse = response as {
    data?: unknown;
    user?: ProfileData;
    profile?: ProfileData;
  };

  if (objectResponse.profile) return objectResponse.profile;
  if (objectResponse.user) return objectResponse.user;

  if (objectResponse.data && typeof objectResponse.data === "object") {
    const data = objectResponse.data as {
      user?: ProfileData;
      profile?: ProfileData;
      data?: ProfileData;
      full_name?: string;
      email?: string;
      phone?: string;
      role?: string;
    };

    if (data.profile) return data.profile;
    if (data.user) return data.user;
    if (data.data) return data.data;

    if (data.full_name || data.email || data.phone || data.role) {
      return data;
    }
  }

  return null;
}

function getStoredProfile(): ProfileData | null {
  if (typeof window === "undefined") return null;

  const possibleKeys = ["user", "auth_user", "kivu_user", "kivu_advisory_user"];

  for (const key of possibleKeys) {
    const value = window.localStorage.getItem(key);

    if (!value) continue;

    try {
      const parsed = JSON.parse(value) as unknown;
      const profile = getProfileFromResponse(parsed);

      if (profile) return profile;
    } catch {
      continue;
    }
  }

  return null;
}

function isStrongPassword(password: string) {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function ProfileForm({ accentColor = "bg-navy" }: ProfileFormProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<ProfileState>(emptyProfile);
  const [passwordForm, setPasswordForm] =
    useState<PasswordState>(emptyPassword);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);

      try {
        const result = await api.get<unknown>("/auth/me");
        const loadedProfile = getProfileFromResponse(result.data);

        if (!cancelled && loadedProfile) {
          setProfile(loadedProfile);
          setForm({
            full_name: loadedProfile.full_name || "",
            email: loadedProfile.email || "",
            phone: loadedProfile.phone || "",
          });
        }
      } catch {
        const storedProfile = getStoredProfile();

        if (!cancelled && storedProfile) {
          setProfile(storedProfile);
          setForm({
            full_name: storedProfile.full_name || "",
            email: storedProfile.email || "",
            phone: storedProfile.phone || "",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfileField = (field: keyof ProfileState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updatePasswordField = (field: keyof PasswordState, value: string) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

 const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (form.full_name.trim().length < 2) {
    toast.error("Full name is required.");
    return;
  }

  setSavingProfile(true);

  try {
    const payload = {
      full_name: form.full_name.trim(),
      company_name: "",
      phone: form.phone.trim(),
      whatsapp: "",
      location: "",
    };

    const result = await api.put<unknown>("/auth/profile", payload);
    const updatedProfile = getProfileFromResponse(result.data);

    setProfile((current) => ({
      ...(current || {}),
      ...(updatedProfile || {}),
      full_name: payload.full_name,
      phone: payload.phone,
    }));

    setForm((current) => ({
      ...current,
      full_name: updatedProfile?.full_name || payload.full_name,
      phone: updatedProfile?.phone || payload.phone,
    }));

    toast.success("Profile updated successfully.");
  } catch (error) {
    toast.error(getSafeErrorMessage(error, "Failed to update profile."));
  } finally {
    setSavingProfile(false);
  }
};

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordForm.current_password.trim()) {
      toast.error("Current password is required.");
      return;
    }

    if (!isStrongPassword(passwordForm.new_password)) {
      toast.error(
        "New password must have at least 10 characters, uppercase, lowercase, number, and special character.",
      );
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      await api.patch("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
    });

      toast.success("Password changed successfully.");
      setPasswordForm(emptyPassword);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to change password."));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white" />
        <div className="h-56 animate-pulse rounded-xl border border-gray-100 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentColor}`}
          >
            <UserRound size={22} className="text-white" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy">
              Personal Information
            </h2>

            <p className="text-sm text-gray-500">
              {profile?.role
                ? `Role: ${profile.role}`
                : "Manage your account profile."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <TextInput
            label="Full Name *"
            value={form.full_name}
            onChange={(value) => updateProfileField("full_name", value)}
            placeholder="Your full name"
          />

         <TextInput
            label="Email Address"
            type="email"
            value={form.email}
            onChange={() => {}}
            placeholder="your@email.com"
            disabled
        />

          <TextInput
            label="Phone Number"
            value={form.phone}
            onChange={(value) => updateProfileField("phone", value)}
            placeholder="078 XXX XXXX"
          />

          <button
            type="submit"
            disabled={savingProfile}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${accentColor}`}
          >
            <Save size={15} />
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentColor}`}
          >
            <Lock size={22} className="text-white" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy">Change Password</h2>
            <p className="text-sm text-gray-500">
              Use a strong password to protect your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <TextInput
            label="Current Password *"
            type="password"
            value={passwordForm.current_password}
            onChange={(value) =>
              updatePasswordField("current_password", value)
            }
            placeholder="Enter current password"
          />

          <TextInput
            label="New Password *"
            type="password"
            value={passwordForm.new_password}
            onChange={(value) => updatePasswordField("new_password", value)}
            placeholder="Enter new password"
          />

          <TextInput
            label="Confirm New Password *"
            type="password"
            value={passwordForm.confirm_password}
            onChange={(value) =>
              updatePasswordField("confirm_password", value)
            }
            placeholder="Confirm new password"
          />

          <div className="rounded-lg bg-lightgray p-3 text-xs leading-relaxed text-gray-500">
            Password must contain at least 10 characters, uppercase letter,
            lowercase letter, number, and special character.
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${accentColor}`}
          >
            <Lock size={15} />
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
};

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: TextInputProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>

     <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
     />
    </div>
  );
}