import { Bell, Building2, LockKeyhole, Mail, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Business profile",
    icon: <Building2 className="h-5 w-5" />,
    items: [
      ["Company", "Kivu Advisory"],
      ["Primary region", "Rwanda and regional advisory engagements"],
      ["Brand color", "Navy #092B44 with gold accents"],
    ],
  },
  {
    title: "Contact information",
    icon: <Phone className="h-5 w-5" />,
    items: [
      ["Support email", "Managed through current website and admin contact flows"],
      ["Consultation intake", "Handled through public consultation submissions"],
      ["Client follow-up", "Tracked from service requests and role dashboards"],
    ],
  },
  {
    title: "Notification channels",
    icon: <Bell className="h-5 w-5" />,
    items: [
      ["Operational status", "Read-only placeholder until backend settings endpoints are confirmed"],
      ["Delivery updates", "Continue using existing request and assignment status updates"],
      ["Content publishing", "Managed through current blog and content workflows"],
    ],
  },
  {
    title: "Security reminder",
    icon: <LockKeyhole className="h-5 w-5" />,
    items: [
      ["Authentication", "Current auth provider and redirect logic remain unchanged"],
      ["User profile edits", "Not enabled here without confirmed backend support"],
      ["Admin caution", "Review role access and passwords through the existing auth system"],
    ],
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Business settings overview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          This page is intentionally read-only until dedicated settings endpoints are available.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#092B44]/10 text-[#092B44]">
                  {section.icon}
                </span>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {section.items.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-900">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
