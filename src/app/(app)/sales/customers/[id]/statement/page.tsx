import { notFound } from "next/navigation";
import { getCustomerStatement } from "@/lib/actions/accounting";
import { PageHeader, Card } from "@/components/ui";

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer, rows, closingBalance } = await getCustomerStatement(id);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={`Statement of Account — ${customer.nameAr} / ${customer.nameEn}`}
        subtitle={`${customer.customerCode || "—"} · VAT: ${customer.vatNumber || "—"} · CR: ${customer.crNumber || "—"}`}
        action={
          <div className="flex items-center gap-4">
            <a
              href={`/api/customers/${id}/statement-pdf`}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              PDF
            </a>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-stone-400">Outstanding (Net)</p>
              <p className={`text-xl font-bold ${closingBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {closingBalance.toFixed(2)}
              </p>
            </div>
          </div>
        }
      />

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-3 py-3">Customer No.</th>
              <th className="px-3 py-3">Customer Name</th>
              <th className="px-3 py-3">Project Start</th>
              <th className="px-3 py-3">Project End</th>
              <th className="px-3 py-3">Invoice No.</th>
              <th className="px-3 py-3">Proposal No.</th>
              <th className="px-3 py-3">Invoice Date</th>
              <th className="px-3 py-3 text-right">Value (excl. VAT)</th>
              <th className="px-3 py-3 text-right">VAT</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3">Allocation No.</th>
              <th className="px-3 py-3 text-right">Allocated Amount</th>
              <th className="px-3 py-3">Receipt Date</th>
              <th className="px-3 py-3">Approval Date</th>
              <th className="px-3 py-3 text-right">Amount Received</th>
              <th className="px-3 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-stone-100 last:border-0">
                <td className="px-3 py-3 text-stone-500">{row.customerCode}</td>
                <td className="px-3 py-3 text-stone-700">{row.customerName}</td>
                <td className="px-3 py-3 text-stone-500">{row.projectStartDate}</td>
                <td className="px-3 py-3 text-stone-500">{row.projectEndDate}</td>
                <td className="px-3 py-3 font-medium text-stone-800">{row.invoiceNumber}</td>
                <td className="px-3 py-3 text-stone-500">{row.proposalNumber}</td>
                <td className="px-3 py-3 text-stone-500">{row.invoiceDate}</td>
                <td className="px-3 py-3 text-right font-mono">{row.valueExclVat.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono">{row.vat.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono">{row.total.toFixed(2)}</td>
                <td className="px-3 py-3 text-stone-500">{row.allocationNumber}</td>
                <td className="px-3 py-3 text-right font-mono">{row.allocatedAmount.toFixed(2)}</td>
                <td className="px-3 py-3 text-stone-500">{row.receiptDate}</td>
                <td className="px-3 py-3 text-stone-500">{row.approvalDate}</td>
                <td className="px-3 py-3 text-right font-mono text-emerald-700">{row.amountReceived.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono font-medium">{row.net.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-stone-400">
                  No tax invoices yet.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-stone-200 bg-stone-50 font-semibold">
                <td colSpan={15} className="px-3 py-3 text-right">
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
