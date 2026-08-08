import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Company, Role } from "@/types";

export async function requireRole(allowed: Role[], redirectTo = "/dashboard") {
  const session = await auth();
  if (!session?.user?.role || !allowed.includes(session.user.role)) {
    redirect(redirectTo);
  }
  return session;
}

const MULTI_COMPANY_ROLES: Role[] = ["admin", "accountant"];

export function isMultiCompanyRole(role: Role | "" | undefined) {
  return !!role && MULTI_COMPANY_ROLES.includes(role);
}

/**
 * The company whose data the current request should operate on.
 * Locked roles (sales/hr/warehouse/transaction_manager) always get their assigned company.
 * admin/accountant read the `activeCompanyId` cookie (set via setActiveCompany), falling back
 * to the first company if the cookie is missing or stale.
 */
export async function getActiveCompanyId(): Promise<string> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!isMultiCompanyRole(session.user.role)) {
    const companyId = session.user.companyId;
    if (!companyId) redirect("/dashboard"); // misconfigured user — fail closed, not open
    return companyId;
  }

  const cookieCompanyId = (await cookies()).get("activeCompanyId")?.value;
  if (cookieCompanyId) {
    const exists = await db.companies.findOneAsync<Company>({ _id: cookieCompanyId });
    if (exists) return cookieCompanyId;
  }

  const fallback = await db.companies.findOneAsync<Company>({});
  if (!fallback?._id) redirect("/dashboard");
  return fallback._id;
}
