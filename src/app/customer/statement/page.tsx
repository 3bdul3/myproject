import { requireCustomerAuth } from "@/lib/customerAuth";
import { getMyStatement } from "@/lib/actions/customerPortal";
import { Card } from "@/components/ui";

export default async function CustomerStatementPage() {
  await requireCustomerAuth();
  const { rows, closingBalance } = await getMyStatement();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Statement of Account</h1>
          <p className="text-sm text-stone-500">Your tax invoices and payments with us</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-stone-400">Outstanding (Net)</p>
          <p className={`text-xl font-bold ${closingBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {closingBalance.toFixed(2)}
          </p>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-3 py-3">Invoice No.</th>
              <th className="px-3 py-3">Invoice Date</th>
              <th className="px-3 py-3 text-right">Value (excl. VAT)</th>
              <th className="px-3 py-3 text-right">VAT</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Amount Received</th>
              <th className="px-3 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-stone-100 last:border-0">
                <td className="px-3 py-3 font-medium text-stone-800">{row.invoiceNumber}</td>
                <td className="px-3 py-3 text-stone-500">{row.invoiceDate}</td>
                <td className="px-3 py-3 text-right font-mono">{row.valueExclVat.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono">{row.vat.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono">{row.total.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono text-emerald-700">{row.amountReceived.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono font-medium">{row.net.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                  No tax invoices yet.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-stone-200 bg-stone-50 font-semibold">
                <td colSpan={6} className="px-3 py-3 text-right">
                  Net Outstanding
                </td>
                <td className="px-3 py-3 text-right font-mono">{closingBalance.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
