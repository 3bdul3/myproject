import Link from "next/link";
import { createProposal, listProposals } from "@/lib/actions/proposals";
import { listCustomers } from "@/lib/actions/crm";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";

const statusTone: Record<string, "green" | "amber" | "slate"> = {
  draft: "slate",
  sent: "amber",
  signed: "green",
};

export default async function ProposalsPage() {
  const [proposals, customers] = await Promise.all([listProposals(), listCustomers()]);

  return (
    <div>
      <PageHeader title="Proposals" subtitle="Proposals must be signed and uploaded before a tax invoice can be issued" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p._id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{p.number}</td>
                  <td className="px-4 py-3 text-stone-700">{p.customerName}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {p.projectStartDate} – {p.projectEndDate}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{p.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge text={p.status} tone={statusTone[p.status]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/sales/proposals/${p._id}`}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No proposals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Proposal</summary>
              <form action={createProposal} className="mt-4 grid grid-cols-1 gap-3">
                <Select
                  label="Customer"
                  name="customerId"
                  required
                  options={customers.map((c) => ({
                    value: c._id!,
                    label: `${c.customerCode ?? "—"} — ${c.nameAr} / ${c.nameEn}`,
                  }))}
                />
                <Field label="Amount" name="amount" type="number" step="0.01" required />
                <Field label="Project Start Date" name="projectStartDate" type="date" required />
                <Field label="Project End Date" name="projectEndDate" type="date" required />
                <Field label="Notes" name="notes" />
                <SubmitButton label="Create Proposal" />
              </form>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
