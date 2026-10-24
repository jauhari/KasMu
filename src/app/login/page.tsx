import { prisma } from "@/lib/prisma";
import LoginForm, { UserProfile } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let initialUsers: UserProfile[] = [
    { id: "cmvhaxa6a0000q14a0gljr5md", username: "owner", name: "Owner Agen Mini-Atm", role: "OWNER" },
    { id: "cmvhaxa6l0001q14a3rsskj0e", username: "kasir1", name: "Kasir Kris Brilink", role: "STAFF" },
  ];

  try {
    const dbUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, name: true, role: true },
      orderBy: { role: "asc" },
    });
    if (dbUsers.length > 0) {
      initialUsers = dbUsers;
    }
  } catch (err) {
    console.error("Error loading users in LoginPage:", err);
  }

  return <LoginForm initialUsers={initialUsers} />;
}
