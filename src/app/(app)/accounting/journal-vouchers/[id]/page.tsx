import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice, getJournalEntry } from "@/lib/actions/accounting";
import { getBill } from "@/lib/actions/ap";
import { PageHeader, Card, Badge } from "@/components/ui";

const sourceTone: Record<string, "green" | "indigo" | "amber" | "slate"> = {
  invoice: "indigo",
  credit_note: "green",
  debit_note: "amber",
  payment: "slate",
  manual: "slate",
  bill: "slate",
};

const linkedSourceTypes = new Set(["invoice", "credit_note", "debit_note", "payment", "bill"]);

export default async function JournalVoucherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getJournalEntry(id);
  if (!entry) notFound();

  let sourceInvoice = null;
  let sourceBill = null;
  if (entry.sourceType && entry.sourceId && linkedSourceTypes.has(entry.sourceType)) {
    // "payment" is used by both customer payments (sourceId -> invoice) and supplier
    // payments (sourceId -> bill), so try both rather than trusting sourceType alone.
    sourceInvoice = await getInvoice(entry.sourceId);
    if (!sourceInvoice) sourceBill = await getBill(entry.sourceId);
  }

  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);

  return (
    <div>
      <PageHeader
        title={`Journal Voucher ${entry.number}`}
        subtitle={entry.memo}
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Journal Vouchers", href: "/accounting/journal-vouchers" },
          { label: entry.number },
        ]}
        action={entry.sourceType && <Badge text={entry.sourceType.replace("_", " ")} tone={sourceTone[entry.sourceType]} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="pb-2">Account</th>
                <th className="pb-2 text-right">Debit</th>
                <th className="pb-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((l, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 text-stone-700">{l.accountName}</td>
                  <td className="py-2 text-right font-mono">{l.debit > 0 ? l.debit.toFixed(2) : ""}</td>
                  <td className="py-2 text-right font-mono">{l.credit > 0 ? l.credit.toFixed(2) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-stone-200 font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right font-mono">{totalDebit.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">{totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">Date</p>
                <p className="text-stone-700">{entry.date}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">Description</p>
                <p className="text-stone-700">{entry.memo}</p>
              </div>
            </div>
          </Card>

          {sourceInvoice && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-stone-700">Related Document</h3>
              <Link
                href={`/accounting/invoices/${sourceInvoice.number}`}
                className="text-sm text-brand-600 hover:underline"
              >
                {sourceInvoice.number}
              </Link>
            </Card>
          )}

          {sourceBill && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-stone-700">Related Bill</h3>
              <Link
                href={`/accounting/payable/${sourceBill.number}`}
                className="text-sm text-brand-600 hover:underline"
              >
                {sourceBill.number}
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
