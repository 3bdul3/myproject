import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/types";

export async function requireRole(allowed: Role[], redirectTo = "/dashboard") {
  const session = await auth();
  if (!session?.user?.role || !allowed.includes(session.user.role)) {
    redirect(redirectTo);
  }
  return session;
}
