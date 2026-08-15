import Link from "next/link";
import { getApSummary, listBills } from "@/lib/actions/ap";
import { PageHeader, Card, StatCard, Badge } from "@/components/ui";

const statusTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  draft: "slate",
  posted: "indigo",
  partial: "amber",
  paid: "green",
};

export default async function AccountsPayablePage() {
  const [summary, bills] = await Promise.all([getApSummary(), listBills()]);

  return (
    <div>
      <PageHeader
        title="Accounts Payable"
        subtitle="Supplier bills and what the company owes suppliers and ZATCA — separate from Accounts Receivable"
        action={
          <Link
            href="/accounting/payable/new"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            + New Bill
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Bill No.</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Supplier Invoice #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b._id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link href={`/accounting/payable/${b.number}`} className="font-medium text-brand-600">
                      {b.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{b.supplierName}</td>
                  <td className="px-4 py-3 text-stone-500">{b.supplierInvoiceNumber || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{b.date}</td>
                  <td className="px-4 py-3 text-right font-mono">{b.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{b.amountPaid.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge text={b.status} tone={statusTone[b.status]} />
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                    No bills yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Accounts Payable (Trade)" value={summary.apTradeBalance.toFixed(2)} />
            {summary.zakatAccounts.map((a) => (
              <StatCard key={a._id} label={a.nameEn} value={a.balance.toFixed(2)} />
            ))}
          </div>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Outstanding by Supplier</h3>
            {summary.supplierBalances.length === 0 && (
              <p className="text-sm text-stone-400">No outstanding supplier balances.</p>
            )}
            <div className="space-y-2">
              {summary.supplierBalances.map((s) => (
                <div key={s.supplierId} className="flex justify-between text-sm">
                  <span className="text-stone-600">{s.supplierName}</span>
                  <span className="font-mono font-medium">{s.outstanding.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
