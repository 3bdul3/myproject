"use client";

import { useState } from "react";
import { createAccount } from "@/lib/actions/accounting";
import { Field, SubmitButton } from "@/components/ui";
import type { AccountGroup, AccountType } from "@/types";

const TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

const GROUP_OPTIONS: Record<AccountType, Array<{ value: AccountGroup; label: string }>> = {
  asset: [
    { value: "general", label: "General (1xxx)" },
    { value: "ar", label: "Accounts Receivable (11xx)" },
  ],
  liability: [
    { value: "general", label: "General (22xx)" },
    { value: "ap_trade", label: "Accounts Payable — Trade (20xx)" },
    { value: "ap_zakat", label: "Accounts Payable — Zakat & Tax (205x)" },
  ],
  equity: [{ value: "general", label: "General (3xxx)" }],
  revenue: [{ value: "general", label: "General (4xxx)" }],
  expense: [{ value: "general", label: "General (5xxx)" }],
};

export default function AccountCreateForm() {
  const [type, setType] = useState<AccountType>("asset");
  const groupOptions = GROUP_OPTIONS[type];

  return (
    <form action={createAccount} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
      <Field label="Name" name="name" required />

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Group</label>
        <select
          key={type}
          name="group"
          defaultValue={groupOptions[0].value}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {groupOptions.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton label="Add Account" />
    </form>
  );
}
