import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/domain";

export default function AdminHomePage() {
  redirect(ROUTES.admin.clients);
}
