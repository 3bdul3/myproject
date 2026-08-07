import { auth } from "@/auth";
import SideNav from "@/components/SideNav";
import { getCompanySettings } from "@/lib/actions/settings";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, company] = await Promise.all([auth(), getCompanySettings()]);

  return (
    <div className="min-h-screen bg-canvas">
      <SideNav
        userName={session?.user?.name ?? ""}
        userRole={session?.user?.role ?? ""}
        logoDataUrl={company.logoDataUrl}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
