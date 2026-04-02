import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAuthSession } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/admin-dashboard";

export default async function AdminPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=%2Fadmin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/market");
  }

  const dashboard = await getAdminDashboardData();
  const serializedDashboard = JSON.parse(JSON.stringify(dashboard));

  return <AdminDashboard data={serializedDashboard} />;
}
