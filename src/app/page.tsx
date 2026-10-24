import DashboardClient from "./DashboardClient";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const initialData = await getDashboardData(session.role, session.userId);

  return <DashboardClient initialData={initialData} currentUser={session} />;
}
