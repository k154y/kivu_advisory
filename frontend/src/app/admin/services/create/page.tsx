import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function AdminServiceCreatePage() {
  redirect(routes.admin.services);
}
