"use client";

import { useState } from "react";
import { createAccount } from "@/lib/actions/accounting";
import { Field, SubmitButton } from "@/components/ui";
import type { 
  AccountCategory, 
  AccountPostingType, 
  AccountType, 
  SubLedgerType 
} from "@/types";

const TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "asset", label: "Asset (أصول)" },
  { value: "liability", label: "Liability (التزامات)" },
  { value: "equity", label: "Equity (حقوق الملكية)" },
  { value: "revenue", label: "Revenue (الإيرادات)" },
  { value: "expense", label: "Expense (المصروفات)" },
];

const CATEGORY_OPTIONS: Record<AccountType, Array<{ value: AccountCategory; label: string }>> = {
  asset: [
    { value: "cash", label: "Cash (نقد)" },
    { value: "fixed_assets", label: "Fixed Assets (أصول ثابتة)" },
    { value: "receivables", label: "Receivables (ذمم مدينة)" },
    { value: "tax", label: "Tax (ضرائب)" },
  ],
  liability: [
    { value: "payables", label: "Payables (ذمم دائنة)" },
    { value: "tax", label: "Tax (ضرائب)" },
  ],
  equity: [
    { value: "equity", label: "Equity (حقوق الملكية)" },
  ],
  revenue: [
    { value: "revenue", label: "Revenue (الإيرادات)" },
  ],
  expense: [
    { value: "expenses", label: "Expenses (المصروفات)" },
  ],
};

const SUB_LEDGER_OPTIONS: Array<{ value: SubLedgerType; label: string }> = [
  { value: "general", label: "General Ledger (دفتر الأستاذ العام)" },
  { value: "customer", label: "Customer Sub-ledger (دفتر العملاء)" },
  { value: "supplier", label: "Supplier Sub-ledger (دفتر الموردين)" },
];

const POSTING_TYPE_OPTIONS: Array<{ value: AccountPostingType; label: string; description: string }> = [
  { value: "header", label: "Header Account", description: "Parent account only (no direct entries)" },
  { value: "posting", label: "Posting Account", description: "Regular account for journal entries" },
  { value: "control", label: "Control Account", description: "Summary for sub-ledger (AR/AP)" },
];

export default function AccountCreateForm({ parentAccounts }: { parentAccounts?: Array<{ _id: string; code: string; nameEn: string }> }) {
  const [type, setType] = useState<AccountType>("asset");
  const [category, setCategory] = useState<AccountCategory>("cash");
  const [postingType, setPostingType] = useState<AccountPostingType>("posting");
  const categoryOptions = CATEGORY_OPTIONS[type];
  const showParentOption = parentAccounts && parentAccounts.length > 0;

  return (
    <form action={createAccount} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
      <Field label="Account Name (Arabic)" name="nameAr" required placeholder="مثال: الصندوق" />
      <Field label="Account Name (English)" name="nameEn" required placeholder="Example: Cash" />

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Account Type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as AccountType);
            setCategory(CATEGORY_OPTIONS[e.target.value as AccountType][0].value);
          }}
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
        <label className="mb-1 block text-xs font-medium text-stone-600">Account Category</label>
        <select
          key={type}
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as AccountCategory)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {categoryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Sub-ledger Type</label>
        <select
          name="subLedgerType"
          defaultValue="general"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {SUB_LEDGER_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Posting Type</label>
        <select
          name="postingType"
          value={postingType}
          onChange={(e) => setPostingType(e.target.value as AccountPostingType)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {POSTING_TYPE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label} - {p.description}
            </option>
          ))}
        </select>
      </div>

      {showParentOption && (
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Parent Account (Optional)</label>
          <select
            name="parentId"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">-- No Parent (Root Account) --</option>
            {parentAccounts.map((p) => (
              <option key={p._id} value={p._id}>
                {p.code} - {p.nameEn}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allowManualEntry"
          name="allowManualEntry"
          value="true"
          disabled={postingType === "header"}
          className="rounded border-stone-300 text-brand-500 focus:ring-brand-500"
        />
        <label htmlFor="allowManualEntry" className="text-xs text-stone-600">
          Allow Manual Journal Entries
        </label>
      </div>

      <div className="sm:col-span-2">
        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
          <strong>Account Code:</strong> Will be auto-generated based on type and category
        </div>
      </div>

      <SubmitButton label="Add Account" className="sm:col-span-2" />
    </form>
  );
}
