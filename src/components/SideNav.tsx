"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { setActiveCompany } from "@/lib/actions/companies";
import NotificationBell, { type LiveAlert } from "@/components/NotificationBell";
import type { Notification, Role } from "@/types";

const modules = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", items: [] as Array<{ href: string; label: string }> },
  {
    key: "my",
    label: "My Workspace",
    href: "/my/leave",
    items: [
      { href: "/my/leave", label: "Leave Requests" },
      { href: "/my/tasks", label: "My Tasks" },
      { href: "/settings/security", label: "Security" },
    ],
  },
  {
    key: "accounting",
    label: "Accounting",
    href: "/accounting/accounts",
    items: [
      { href: "/accounting/accounts", label: "Chart of Accounts" },
      { href: "/accounting/receivable", label: "Accounts Receivable" },
      { href: "/accounting/payable", label: "Accounts Payable" },
      { href: "/accounting/invoices", label: "Transactions" },
      { href: "/accounting/journal-vouchers", label: "Journal Vouchers" },
      { href: "/accounting/reports", label: "Reports" },
    ],
  },
  {
    key: "sales",
    label: "Sales & CRM",
    href: "/sales/customers",
    items: [
      { href: "/sales/customers", label: "Customers" },
      { href: "/sales/proposals", label: "Proposals" },
      { href: "/sales/leads", label: "Leads" },
      { href: "/sales/orders", label: "Sales Orders" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/inventory/products",
    items: [
      { href: "/inventory/products", label: "Products" },
      { href: "/inventory/warehouses", label: "Warehouses" },
      { href: "/inventory/stock", label: "Stock Movements" },
      { href: "/inventory/suppliers", label: "Suppliers" },
      { href: "/inventory/purchase-orders", label: "Purchase Orders" },
    ],
  },
  {
    key: "hr",
    label: "HR",
    href: "/hr/employees",
    items: [
      { href: "/hr/employees", label: "Employees" },
      { href: "/hr/departments", label: "Departments" },
      { href: "/hr/attendance", label: "Attendance" },
      { href: "/hr/payroll", label: "Payroll" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings/company",
    items: [{ href: "/settings/company", label: "Company Info" }],
  },
];

const ADMIN_SETTINGS_ITEMS = [
  { href: "/settings/companies", label: "Companies" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/audit-log", label: "Audit Log" },
  { href: "/settings/backups", label: "Backups" },
];

const EXECUTIVE_MODULE = {
  key: "executive",
  label: "Executive",
  href: "/executive",
  items: [] as Array<{ href: string; label: string }>,
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  accountant: "Accountant",
  sales: "Sales",
  hr: "HR",
  warehouse: "Warehouse",
  transaction_manager: "Transaction Manager",
};

export default function SideNav({
  userName,
  userRole,
  logoDataUrl,
  activeCompanyName,
  activeCompanyId,
  companies,
  notifications,
  unreadCount,
  liveAlerts,
}: {
  userName: string;
  userRole: Role | "";
  logoDataUrl?: string;
  activeCompanyName: string;
  activeCompanyId?: string;
  /** Only passed for admin/accountant — presence of >1 entry is what shows the switcher. */
  companies?: Array<{ _id: string; name: string }>;
  notifications: Notification[];
  unreadCount: number;
  liveAlerts?: LiveAlert[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const canSeeApprovals = userRole === "admin" || userRole === "accountant" || userRole === "hr";

  const visibleModules = (userRole === "admin" ? [...modules, EXECUTIVE_MODULE] : modules).map((m) => {
    if (m.key === "settings" && userRole === "admin") {
      return { ...m, items: [...m.items, ...ADMIN_SETTINGS_ITEMS] };
    }
    if (m.key === "my" && canSeeApprovals) {
      return { ...m, items: [...m.items, { href: "/approvals", label: "Approvals" }] };
    }
    return m;
  });

  const activeModule =
    visibleModules.find((m) => m.key !== "dashboard" && pathname.startsWith(`/${m.key}`)) ?? visibleModules[0];

  const showSwitcher = !!companies && companies.length > 1;

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-navy-700 px-4">
          {logoDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoDataUrl} alt="Company logo" className="h-8 w-8 flex-shrink-0 rounded-lg object-contain" />
          ) : (
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {activeCompanyName.charAt(0).toUpperCase() || "?"}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            {showSwitcher ? (
              <form action={setActiveCompany}>
                <select
                  name="companyId"
                  defaultValue={activeCompanyId}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="w-full truncate border-none bg-transparent p-0 text-sm font-semibold text-white outline-none"
                >
                  {companies!.map((c) => (
                    <option key={c._id} value={c._id} className="text-stone-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              </form>
            ) : (
              <p className="truncate text-sm font-semibold text-white">{activeCompanyName}</p>
            )}
            <p className="text-[10px] text-navy-200">ERP System</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleModules.map((m) => {
            const moduleActive = m.key === "dashboard" ? pathname === "/dashboard" : activeModule.key === m.key;
            return (
              <div key={m.key}>
                <Link
                  href={m.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    moduleActive ? "bg-navy-700 text-white" : "text-navy-200 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  {m.label}
                </Link>
                {m.items.length > 0 && (
                  <div className="mt-1 space-y-0.5 border-l border-navy-700 pl-3">
                    {m.items.map((item) => {
                      const itemActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`block rounded-lg px-3 py-1.5 text-sm transition ${
                            itemActive ? "font-medium text-brand-400" : "text-navy-200 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-stone-200 bg-white px-4 lg:pl-64 lg:pr-6">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="rounded-lg border border-stone-200 p-2 lg:hidden"
        >
          <span className="block h-0.5 w-5 bg-stone-700" />
          <span className="my-1 block h-0.5 w-5 bg-stone-700" />
          <span className="block h-0.5 w-5 bg-stone-700" />
        </button>

        <div className="ml-auto flex items-center gap-3">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} liveAlerts={liveAlerts} />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-stone-800">{userName}</p>
            <p className="text-xs text-stone-400">{ROLE_LABELS[userRole] ?? userRole}</p>
          </div>
          <form action={logoutAction}>
            <button className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
              Sign out
            </button>
          </form>
        </div>
      </header>
    </>
  );
}
