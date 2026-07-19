import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function AdminServiceDetailPage() {
  redirect(routes.admin.services);
}
