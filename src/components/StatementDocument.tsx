import type { CompanySettings, Customer } from "@/types";
import type { CustomerStatementRow } from "@/lib/actions/accounting";

export default function StatementDocument({
  customer,
  rows,
  closingBalance,
  company,
}: {
  customer: Customer | null | undefined;
  rows: CustomerStatementRow[];
  closingBalance: number;
  company: CompanySettings;
}) {
  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-stone-900">
      <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h1 className="text-lg font-bold">Statement of Account</h1>
          <p className="text-sm text-stone-500">{customer?.nameEn || customer?.nameAr}</p>
        </div>
        {company.logoDataUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={company.logoDataUrl} alt="Company logo" className="max-h-14 max-w-14 object-contain" />
        )}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-stone-200 p-3 text-sm">
        <span className="text-stone-500">Customer Code: {customer?.customerCode || "—"}</span>
        <span className="font-semibold">
          Outstanding (Net): <span className="font-mono">{closingBalance.toFixed(2)}</span>
        </span>
      </div>

      <div className="rounded-xl border border-stone-200 p-3">
        <table className="w-full text-xs">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="py-2 text-left font-medium">Invoice No.</th>
              <th className="py-2 text-left font-medium">Date</th>
              <th className="py-2 text-right font-medium">Value (excl. VAT)</th>
              <th className="py-2 text-right font-medium">VAT</th>
              <th className="py-2 text-right font-medium">Total</th>
              <th className="py-2 text-right font-medium">Received</th>
              <th className="py-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-stone-100 last:border-0">
                <td className="py-2 font-medium">{row.invoiceNumber}</td>
                <td className="py-2">{row.invoiceDate}</td>
                <td className="py-2 text-right font-mono">{row.valueExclVat.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">{row.vat.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">{row.total.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">{row.amountReceived.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">{row.net.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
