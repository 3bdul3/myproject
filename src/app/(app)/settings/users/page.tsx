import { requireRole } from "@/lib/authz";
import {
  listUsers,
  createUser,
  linkEmployeeToUser,
  listEmployeesByCompany,
  setUserActive,
  setUserLoginCode,
  resetUserPassword,
} from "@/lib/actions/users";
import { listCompanies } from "@/lib/actions/companies";
import { adminDisableTotp } from "@/lib/actions/twoFactor";
import { PageHeader, Card, Field, SubmitButton, Badge } from "@/components/ui";
import RoleCompanyFields from "@/components/RoleCompanyFields";
import type { Employee } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  accountant: "Accountant",
  sales: "Sales",
  hr: "HR",
  warehouse: "Warehouse",
  transaction_manager: "Transaction Manager",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await requireRole(["admin"]);
  const currentUserId = session?.user?.id;
  const [users, companies] = await Promise.all([listUsers(), listCompanies()]);
  const companyIds = companies.map((c) => c._id!);
  const employeesByCompanyRaw = await listEmployeesByCompany(companyIds);

  const companyName = new Map(companies.map((c) => [c._id, c.nameEn || c.nameAr]));
  const companyOptions = companies.map((c) => ({ value: c._id!, label: c.nameEn || c.nameAr }));
  const employeesByCompany = Object.fromEntries(
    Object.entries(employeesByCompanyRaw).map(([companyId, employees]) => [
      companyId,
      (employees as Employee[]).map((e) => ({ value: e._id!, label: e.name })),
    ])
  );

  // Employee -> User linkage is stored only on Employee.userId; derive the reverse lookup here.
  const linkedEmployeeByUserId = new Map<string, Employee>();
  for (const employees of Object.values(employeesByCompanyRaw) as Employee[][]) {
    for (const e of employees) {
      if (e.userId) linkedEmployeeByUserId.set(e.userId, e);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Admin and Accountant can access every company; other roles are locked to one"
        breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Settings" }]}
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Login Code</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Linked Employee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Password</th>
                <th className="px-4 py-3">2FA</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const companyEmployees = u.companyId
                  ? ((employeesByCompanyRaw[u.companyId] as Employee[] | undefined) ?? [])
                  : [];
                const linkedEmployee = linkedEmployeeByUserId.get(u._id!);
                return (
                  <tr key={u._id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-800">{u.name}</td>
                    <td className="px-4 py-3 text-stone-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <form action={setUserLoginCode.bind(null, u._id!)} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          name="loginCode"
                          defaultValue={u.loginCode ?? ""}
                          placeholder="— none —"
                          className="w-24 rounded-lg border border-stone-300 px-2 py-1 font-mono text-xs outline-none"
                        />
                        <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                          {u.loginCode ? "Update" : "Set"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <Badge text={ROLE_LABELS[u.role] ?? u.role} tone="indigo" />
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {u.companyId ? companyName.get(u.companyId) ?? "—" : "All companies"}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {!u.companyId ? (
                        "—"
                      ) : companyEmployees.length === 0 ? (
                        "—"
                      ) : (
                        <form
                          action={async (formData: FormData) => {
                            "use server";
                            const employeeId = String(formData.get("employeeId") || "");
                            if (employeeId) await linkEmployeeToUser(u._id!, employeeId);
                          }}
                          className="flex items-center gap-2"
                        >
                          <select
                            name="employeeId"
                            defaultValue={linkedEmployee?._id ?? ""}
                            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs outline-none"
                          >
                            <option value="">— None —</option>
                            {companyEmployees.map((e) => (
                              <option key={e._id} value={e._id}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                            {linkedEmployee ? "Update" : "Link"}
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u._id === currentUserId ? (
                        <Badge text="Active" tone="green" />
                      ) : (
                        <form action={setUserActive.bind(null, u._id!, !!u.disabled)} className="flex items-center gap-1.5">
                          <Badge text={u.disabled ? "Disabled" : "Active"} tone={u.disabled ? "red" : "green"} />
                          <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                            {u.disabled ? "Enable" : "Disable"}
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-brand-600">
                          {u.mustChangePassword ? "Pending change" : "Reset"}
                        </summary>
                        <form action={resetUserPassword.bind(null, u._id!)} className="mt-2 space-y-1.5">
                          <input
                            type="password"
                            name="newPassword"
                            placeholder="Temporary password"
                            required
                            minLength={8}
                            className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                          />
                          <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                            Set temporary password
                          </button>
                        </form>
                      </details>
                    </td>
                    <td className="px-4 py-3">
                      {u.totpEnabled ? (
                        <form action={adminDisableTotp.bind(null, u._id!)} className="flex items-center gap-2">
                          <Badge text="On" tone="green" />
                          <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                            Reset
                          </button>
                        </form>
                      ) : (
                        <Badge text="Off" tone="slate" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-400">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">+ New User</h3>
            {companies.length === 0 ? (
              <p className="text-sm text-stone-400">Create a company first.</p>
            ) : (
              <form action={createUser} className="space-y-3">
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
                <Field label="Password" name="password" type="password" required />
                <Field label="Login Code (optional)" name="loginCode" placeholder="e.g. C8n7fk" />
                <RoleCompanyFields companies={companyOptions} employeesByCompany={employeesByCompany} />
                <SubmitButton label="Add User" />
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
