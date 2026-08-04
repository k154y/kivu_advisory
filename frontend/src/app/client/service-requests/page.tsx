import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function ClientServiceRequestsAliasPage() {
  redirect(routes.client.requests);
}