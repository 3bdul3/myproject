import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SideNav from "@/components/SideNav";
import { db } from "@/lib/db";
import { getActiveCompanyId, isMultiCompanyRole } from "@/lib/authz";
import { listCompanies } from "@/lib/actions/companies";
import { listNotifications, getUnreadNotificationCount } from "@/lib/actions/notifications";
import { getAttentionItems } from "@/lib/actions/executive";
import { isPasswordExpired } from "@/lib/passwordPolicy";
import type { Company, User } from "@/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Checked fresh on every request rather than baked into the JWT, so a completed password
  // change takes effect on the very next navigation without needing to re-mint the session token.
  if (session?.user?.id) {
    const currentUser = await db.users.findOneAsync<User>({ _id: session.user.id });
    if (currentUser?.mustChangePassword || isPasswordExpired(currentUser?.passwordChangedAt)) {
      redirect("/change-password");
    }
  }

  const activeCompanyId = await getActiveCompanyId();
  const [activeCompany, notifications, unreadCount] = await Promise.all([
    db.companies.findOneAsync<Company>({ _id: activeCompanyId }),
    listNotifications(),
    getUnreadNotificationCount(),
  ]);

  const companies = isMultiCompanyRole(session?.user?.role)
    ? (await listCompanies()).map((c) => ({ _id: c._id!, name: c.nameEn || c.nameAr }))
    : undefined;

  const liveAlerts = isMultiCompanyRole(session?.user?.role)
    ? (await getAttentionItems()).map((a) => ({
        title: a.title,
        detail: a.detail,
        href: a.href,
        severity: a.severity,
      }))
    : undefined;

  return (
    <div className="min-h-screen bg-canvas">
      <SideNav
        userName={session?.user?.name ?? ""}
        userRole={session?.user?.role ?? ""}
        logoDataUrl={activeCompany?.logoDataUrl}
        activeCompanyName={activeCompany?.nameEn || activeCompany?.nameAr || "Company"}
        activeCompanyId={activeCompanyId}
        companies={companies}
        notifications={notifications}
        unreadCount={unreadCount}
        liveAlerts={liveAlerts}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
