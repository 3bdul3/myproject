import Link from "next/link";
import { createLead, deleteLead, restoreLead, listLeads, listArchivedLeads } from "@/lib/actions/crm";
import { PageHeader, Card, Field, SubmitButton } from "@/components/ui";
import LeadStatusSelect from "@/components/LeadStatusSelect";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const showArchived = view === "archived";
  const leads = showArchived ? await listArchivedLeads() : await listLeads();

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Sales pipeline and lead qualification"
        action={
          <Link
            href={showArchived ? "/sales/leads" : "/sales/leads?view=archived"}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            {showArchived ? "Back to active leads" : "View archived"}
          </Link>
        }
      />

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
                    {showArchived ? (
                      <span className="capitalize text-stone-500">{lead.status}</span>
                    ) : (
                      <LeadStatusSelect id={lead._id!} status={lead.status} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={async () => {
                        "use server";
                        if (showArchived) await restoreLead(lead._id!);
                        else await deleteLead(lead._id!);
                      }}
                    >
                      <button className={`text-xs hover:underline ${showArchived ? "text-brand-600" : "text-red-500"}`}>
                        {showArchived ? "Restore" : "Delete"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    {showArchived ? "No archived leads." : "No leads yet."}
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
