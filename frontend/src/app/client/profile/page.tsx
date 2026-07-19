"use client";

import { ProfileForm } from "@/components/forms/profile-form";

export default function ClientProfilePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your personal information and contact details.
        </p>
      </div>

      <ProfileForm accentColor="bg-teal" />
    </div>
  );
}