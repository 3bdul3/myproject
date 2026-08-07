import Link from "next/link";
import { getArSummary } from "@/lib/actions/accounting";
import { PageHeader, Card, StatCard } from "@/components/ui";

export default async function AccountsReceivablePage() {
  const summary = await getArSummary();

  return (
    <div>
      <PageHeader
        title="Accounts Receivable"
        subtitle="What customers owe the company — separate from Accounts Payable, rolled up together on the Balance Sheet"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Customer Code</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {summary.customerBalances.map((c) => (
                <tr key={c.customerId} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono text-stone-500">{c.customerCode}</td>
                  <td className="px-4 py-3 text-stone-700">{c.customerName}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{c.outstanding.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/sales/customers/${c.customerId}/statement`}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      View Statement
                    </Link>
                  </td>
                </tr>
              ))}
              {summary.customerBalances.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                    No customer activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <StatCard label="Accounts Receivable" value={summary.arBalance.toFixed(2)} />
        </div>
      </div>
    </div>
  );
}
