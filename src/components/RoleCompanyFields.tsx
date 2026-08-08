"use client";

import { useState } from "react";
import { Select } from "@/components/ui";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
  { value: "hr", label: "HR" },
  { value: "warehouse", label: "Warehouse" },
  { value: "transaction_manager", label: "Transaction Manager" },
];

const MULTI_COMPANY_ROLES = new Set(["admin", "accountant"]);

export default function RoleCompanyFields({
  companies,
  employeesByCompany,
}: {
  companies: Array<{ value: string; label: string }>;
  /** Keyed by companyId — which employees can be offered to link, depends on which company is selected. */
  employeesByCompany: Record<string, Array<{ value: string; label: string }>>;
}) {
  const [role, setRole] = useState("sales");
  const [companyId, setCompanyId] = useState(companies[0]?.value ?? "");
  const locked = !MULTI_COMPANY_ROLES.has(role);
  const employeeOptions = employeesByCompany[companyId] ?? [];

  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Role</label>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {locked && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Company</label>
            <select
              name="companyId"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {companies.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {employeeOptions.length > 0 && (
            <Select
              label="Linked Employee (optional)"
              name="employeeId"
              options={[{ value: "", label: "— None —" }, ...employeeOptions]}
            />
          )}
        </>
      )}
    </>
  );
}
