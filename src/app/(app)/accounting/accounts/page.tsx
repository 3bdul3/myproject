import { listAccounts, getTrialBalanceCheck } from "@/lib/actions/accounting";
import { PageHeader, Card, Badge } from "@/components/ui";
import AccountCreateForm from "@/components/AccountCreateForm";
import type { Account, AccountGroup } from "@/types";

const typeTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  asset: "indigo",
  liability: "amber",
  equity: "slate",
  revenue: "green",
  expense: "red",
};

const SECTIONS: Array<{ group: AccountGroup; title: string; subtitle: string }> = [
  { group: "ar", title: "Accounts Receivable", subtitle: "What customers owe the company" },
  { group: "ap_trade", title: "Accounts Payable — Trade", subtitle: "What the company owes suppliers" },
  {
    group: "ap_zakat",
    title: "Accounts Payable — Zakat & Tax",
    subtitle: "What the company owes the Zakat, Tax and Customs Authority (ZATCA)",
  },
  { group: "general", title: "General Ledger", subtitle: "Everything else" },
];

function AccountTable({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-stone-400">No accounts in this section yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
        <tr>
          <th className="px-4 py-3">Code</th>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3 text-right">Balance</th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((a) => (
          <tr key={a._id} className="border-b border-stone-100 last:border-0">
            <td className="px-4 py-3 font-mono text-stone-500">{a.code}</td>
            <td className="px-4 py-3 font-medium text-stone-800">{a.name}</td>
            <td className="px-4 py-3">
              <Badge text={a.type} tone={typeTone[a.type]} />
            </td>
            <td className="px-4 py-3 text-right font-mono">{a.balance.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AccountsPage() {
  const [accounts, trialBalance] = await Promise.all([listAccounts(), getTrialBalanceCheck()]);

  const bySection = (group: AccountGroup) => accounts.filter((a) => (a.group ?? "general") === group);

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Accounts Receivable and Accounts Payable are tracked as their own sub-ledgers, rolled up together in the Balance Sheet and Income Statement"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {SECTIONS.map((section) => (
            <Card key={section.group} className="p-0 overflow-x-auto">
              <div className="p-4 pb-0">
                <h3 className="text-sm font-semibold text-stone-700">{section.title}</h3>
                <p className="text-xs text-stone-400">{section.subtitle}</p>
              </div>
              <div className="mt-3">
                <AccountTable accounts={bySection(section.group)} />
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <AccountCreateForm />
            <p className="mt-3 text-xs text-stone-400">
              Account codes are assigned automatically based on Type and Group, so every account lands in the
              correct block (Receivable, Payable — Trade, Payable — Zakat &amp; Tax, or General).
            </p>
          </Card>
        </div>
      </div>

      <div
        className={`mt-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
          trialBalance.balanced
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        <span className="font-medium">
          {trialBalance.balanced ? "✓ Trial Balance: In Balance" : "⚠ Trial Balance: Out of Balance"}
        </span>
        <span className="font-mono">
          Debits {trialBalance.totalDebit.toFixed(2)} {trialBalance.balanced ? "=" : "≠"} Credits{" "}
          {trialBalance.totalCredit.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
