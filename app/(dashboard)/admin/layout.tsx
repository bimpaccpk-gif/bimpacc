import { redirect } from "next/navigation";

import { getServiceBillingSettings } from "@/lib/billing";
import { isAdminDashboardRestricted } from "@/lib/billing-policy";
import { getCurrentUser } from "@/lib/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user.role !== "admin") {
    redirect(user.role === "instructor" ? "/instructor" : "/student");
  }

  const billingSettings = await getServiceBillingSettings();

  if (isAdminDashboardRestricted(billingSettings)) {
    redirect("/billing");
  }

  return children;
}
