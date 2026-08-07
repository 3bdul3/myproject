import Link from "next/link";
import { listJournalEntries } from "@/lib/actions/accounting";
import { PageHeader, Card, Badge } from "@/components/ui";

const sourceTone: Record<string, "green" | "indigo" | "amber" | "slate"> = {
  invoice: "indigo",
  credit_note: "green",
  debit_note: "amber",
  payment: "slate",
  manual: "slate",
  bill: "slate",
};

export default async function JournalVouchersPage() {
  const entries = await listJournalEntries();

  return (
    <div>
      <PageHeader
        title="Journal Vouchers"
        subtitle="The general ledger's journal entries — independent of, but linked to, the documents that generated them"
      />

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-4 py-3">JV No.</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Memo</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const amount = e.lines.reduce((s, l) => s + l.debit, 0);
              return (
                <tr key={e._id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono font-medium text-stone-800">{e.number}</td>
                  <td className="px-4 py-3 text-stone-500">{e.date}</td>
                  <td className="px-4 py-3 text-stone-700">{e.memo}</td>
                  <td className="px-4 py-3">
                    {e.sourceType && <Badge text={e.sourceType.replace("_", " ")} tone={sourceTone[e.sourceType]} />}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/accounting/journal-vouchers/${e._id}`} className="text-xs font-medium text-brand-600 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  No journal vouchers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
