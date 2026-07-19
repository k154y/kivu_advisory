import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function AdminContentContactPage() {
  redirect(routes.admin.contentManager);
}
