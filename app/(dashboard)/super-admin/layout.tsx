import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/dal";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user.role !== "admin" || !user.is_super_admin) {
    redirect(
      user.role === "admin" ? "/admin" : user.role === "instructor" ? "/instructor" : "/student"
    );
  }

  return children;
}
