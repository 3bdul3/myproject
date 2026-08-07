import { createLead, deleteLead, listLeads } from "@/lib/actions/crm";
import { PageHeader, Card, Field, SubmitButton } from "@/components/ui";
import LeadStatusSelect from "@/components/LeadStatusSelect";

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <div>
      <PageHeader title="Leads" subtitle="Sales pipeline and lead qualification" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-800">{lead.name}</td>
                  <td className="px-4 py-3 text-stone-500">{lead.contact}</td>
                  <td className="px-4 py-3 text-stone-500">{lead.source}</td>
                  <td className="px-4 py-3 text-right font-mono">{lead.value.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <LeadStatusSelect id={lead._id!} status={lead.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await deleteLead(lead._id!);
                      }}
                    >
                      <button className="text-xs text-red-500 hover:underline">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Lead</summary>
              <form action={createLead} className="mt-4 grid grid-cols-1 gap-3">
                <Field label="Name" name="name" required />
                <Field label="Contact" name="contact" required />
                <Field label="Source" name="source" placeholder="Website, referral..." />
                <Field label="Estimated Value" name="value" type="number" step="0.01" />
                <Field label="Notes" name="notes" />
                <SubmitButton label="Add Lead" />
              </form>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
