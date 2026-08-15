import { getFinancialSummary, getVatReport, listJournalEntries, getTrialBalanceCheck } from "@/lib/actions/accounting";
import { PageHeader, Card, StatCard, Badge } from "@/components/ui";
import Link from "next/link";

const docLabel: Record<string, string> = {
  tax: "Tax Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || new Date().toISOString().slice(0, 7);

  const [summary, entries, vatReport, trialBalance] = await Promise.all([
    getFinancialSummary(),
    listJournalEntries(),
    getVatReport(month),
    getTrialBalanceCheck(),
  ]);

  const byType = (type: string) => summary.accounts.filter((a) => a.type === type);

  return (
    <div>
      <PageHeader title="Financial Reports" subtitle="Balance sheet, income statement, and ledger" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Assets" value={summary.totalAssets.toFixed(2)} />
        <StatCard label="Total Liabilities" value={summary.totalLiabilities.toFixed(2)} />
        <StatCard label="Revenue" value={summary.totalRevenue.toFixed(2)} />
        <StatCard
          label="Net Income"
          value={summary.netIncome.toFixed(2)}
          hint={summary.netIncome >= 0 ? "Profit" : "Loss"}
        />
        <Card className="flex items-center justify-center p-4">
          <Link 
            href="/accounting/reports/trial-balance"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View Trial Balance →
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Balance Sheet</h3>
          {["asset", "liability", "equity"].map((type) => (
            <div key={type} className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase text-stone-400">{type}s</p>
              {byType(type).map((a) => (
                <div key={a._id} className="flex justify-between py-0.5 text-sm">
                  <span className="text-stone-600">{a.nameEn}</span>
                  <span className="font-mono">{a.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Income Statement</h3>
          {["revenue", "expense"].map((type) => (
            <div key={type} className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase text-stone-400">{type}s</p>
              {byType(type).map((a) => (
                <div key={a._id} className="flex justify-between py-0.5 text-sm">
                  <span className="text-stone-600">{a.nameEn}</span>
                  <span className="font-mono">{a.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-sm font-semibold">
            <span>Net Income</span>
            <span>{summary.netIncome.toFixed(2)}</span>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <h3 className="text-sm font-semibold text-stone-700">VAT Report</h3>
          <form method="get" className="flex items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              View
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <StatCard label="Total Sales (excl. VAT)" value={vatReport.totalSales.toFixed(2)} />
          <StatCard label="Output VAT" value={vatReport.outputVat.toFixed(2)} hint="From posted sales invoices" />
          <StatCard label="Input VAT" value={vatReport.inputVat.toFixed(2)} hint="From posted VAT-bearing supplier bills" />
          <StatCard label="Net VAT Due" value={vatReport.netVatDue.toFixed(2)} hint="Output − Input" />
        </div>

        <h4 className="px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Output VAT — Sales Documents
        </h4>
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Value (excl. VAT)</th>
              <th className="px-4 py-3 text-right">VAT</th>
            </tr>
          </thead>
          <tbody>
            {vatReport.documents.map((d) => (
              <tr key={d._id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium text-stone-800">{d.number}</td>
                <td className="px-4 py-3">
                  <Badge text={docLabel[d.docType] ?? d.docType} tone={d.docType === "credit_note" ? "green" : "indigo"} />
                </td>
                <td className="px-4 py-3 text-stone-500">{d.customerName}</td>
                <td className="px-4 py-3 text-stone-500">{d.date}</td>
                <td className="px-4 py-3 text-right font-mono">{d.subtotal.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono">{d.tax.toFixed(2)}</td>
              </tr>
            ))}
            {vatReport.documents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  No invoices posted in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h4 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Input VAT — Supplier Bills
        </h4>
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-4 py-3">Bill No.</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Value (excl. VAT)</th>
              <th className="px-4 py-3 text-right">VAT</th>
            </tr>
          </thead>
          <tbody>
            {vatReport.vatBills.map((b) => (
              <tr key={b._id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium text-stone-800">{b.number}</td>
                <td className="px-4 py-3 text-stone-500">{b.supplierName}</td>
                <td className="px-4 py-3 text-stone-500">{b.date}</td>
                <td className="px-4 py-3 text-right font-mono">{b.subtotal.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono">{b.vat.toFixed(2)}</td>
              </tr>
            ))}
            {vatReport.vatBills.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                  No VAT-bearing supplier bills posted in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6 p-0">
        <h3 className="p-4 pb-0 text-sm font-semibold text-stone-700">General Ledger</h3>
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-4 py-3">JV No.</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Memo</th>
              <th className="px-4 py-3">Lines</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e._id} className="border-b border-stone-100 align-top last:border-0">
                <td className="px-4 py-3 font-mono text-stone-500">{e.number}</td>
                <td className="px-4 py-3 text-stone-500">{e.date}</td>
                <td className="px-4 py-3 text-stone-700">{e.memo}</td>
                <td className="px-4 py-3">
                  {e.lines.map((l, i) => (
                    <div key={i} className="flex justify-between gap-4 text-xs">
                      <span className="text-stone-500">{l.accountName}</span>
                      <span className="font-mono">
                        {l.debit > 0 ? `Dr ${l.debit.toFixed(2)}` : `Cr ${l.credit.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                  No journal entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Trial Balance Status Indicator */}
      <Card className={`mt-6 p-4 ${trialBalance.balanced ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`font-medium ${trialBalance.balanced ? "text-emerald-700" : "text-red-700"}`}>
              {trialBalance.balanced ? "✓ Trial Balance: In Balance" : "⚠ Trial Balance: Out of Balance"}
            </span>
            <div className="text-xs text-stone-600 mt-1">
              Debits {trialBalance.totalDebit.toFixed(2)} {trialBalance.balanced ? "=" : "≠"} Credits {trialBalance.totalCredit.toFixed(2)}
            </div>
          </div>
          <Link 
            href="/accounting/reports/trial-balance"
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            View Full Report
          </Link>
        </div>
      </Card>
    </div>
  );
}
