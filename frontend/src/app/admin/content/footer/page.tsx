import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function AdminContentFooterPage() {
  redirect(routes.admin.contentManager);
}
