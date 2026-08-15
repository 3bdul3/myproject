import { getTrialBalanceReport } from "@/lib/actions/accounting";
import { PageHeader, Card, Badge } from "@/components/ui";

const typeTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  asset: "indigo",
  liability: "amber",
  equity: "slate",
  revenue: "green",
  expense: "red",
};

const postingTypeTone: Record<string, "green" | "amber" | "red"> = {
  header: "amber",
  posting: "green",
  control: "red",
};

export default async function TrialBalancePage() {
  const trialBalance = await getTrialBalanceReport();

  return (
    <div>
      <PageHeader 
        title="Trial Balance" 
        subtitle="Summary of all account balances to verify that total debits equal total credits"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-stone-800">{trialBalance.report.length}</div>
          <div className="text-xs text-stone-500">Total Accounts</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{trialBalance.totalDebit.toFixed(2)}</div>
          <div className="text-xs text-stone-500">Total Debits</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{trialBalance.totalCredit.toFixed(2)}</div>
          <div className="text-xs text-stone-500">Total Credits</div>
        </Card>
        <Card className={`p-4 ${trialBalance.balanced ? "bg-emerald-50" : "bg-red-50"}`}>
          <div className={`text-2xl font-bold ${trialBalance.balanced ? "text-emerald-600" : "text-red-600"}`}>
            {trialBalance.balanced ? "Balanced" : "Out of Balance"}
          </div>
          <div className="text-xs text-stone-500">Status</div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-stone-200 p-4">
          <h3 className="text-sm font-semibold text-stone-700">Trial Balance Report</h3>
          <div className="text-xs text-stone-500">
            Generated: {new Date(trialBalance.generatedAt).toLocaleString()}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Name (EN/AR)</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Posting Type</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.report.map((account) => (
                <tr key={account.code} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono text-stone-500">{account.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{account.nameEn}</div>
                    <div className="text-xs text-stone-500">{account.nameAr}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge text={account.type} tone={typeTone[account.type]} />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600 capitalize">
                    {account.category.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge text={account.postingType} tone={postingTypeTone[account.postingType]} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {account.debit > 0 ? account.debit.toFixed(2) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {account.credit > 0 ? account.credit.toFixed(2) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {account.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-stone-300 bg-stone-50 font-semibold">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right">
                  Totals
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {trialBalance.totalDebit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {trialBalance.totalCredit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(trialBalance.totalDebit - trialBalance.totalCredit).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {!trialBalance.balanced && (
          <div className="border-t border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>⚠ Trial Balance is Out of Balance</strong>
            <p className="mt-1">
              The difference between total debits ({trialBalance.totalDebit.toFixed(2)}) and total credits ({trialBalance.totalCredit.toFixed(2)}) is {(trialBalance.totalDebit - trialBalance.totalCredit).toFixed(2)}.
              Please review your journal entries for errors.
            </p>
          </div>
        )}

        {trialBalance.balanced && (
          <div className="border-t border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <strong>✓ Trial Balance is In Balance</strong>
            <p className="mt-1">
              Total debits equal total credits. Your books are mathematically correct.
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-6 p-4">
        <h4 className="mb-2 text-sm font-semibold text-stone-700">Understanding Trial Balance</h4>
        <ul className="space-y-1 text-xs text-stone-600">
          <li>• <strong>Debit Balance:</strong> Assets and Expenses normally have debit balances</li>
          <li>• <strong>Credit Balance:</strong> Liabilities, Equity, and Revenue normally have credit balances</li>
          <li>• <strong>Balanced:</strong> Total debits must equal total credits for accurate financial statements</li>
          <li>• <strong>Header Accounts:</strong> Shown for reference but don't have direct entries (sum of child accounts)</li>
          <li>• <strong>Control Accounts:</strong> Summary accounts for sub-ledgers (AR/AP)</li>
        </ul>
      </Card>
    </div>
  );
}