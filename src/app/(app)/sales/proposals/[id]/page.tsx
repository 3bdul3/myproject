import { notFound } from "next/navigation";
import { getProposal, markProposalSent, uploadSignedProposal } from "@/lib/actions/proposals";
import { PageHeader, Card, Badge, SubmitButton } from "@/components/ui";

const statusTone: Record<string, "green" | "amber" | "slate"> = {
  draft: "slate",
  sent: "amber",
  signed: "green",
};

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const boundUpload = uploadSignedProposal.bind(null, id);
  const boundMarkSent = markProposalSent.bind(null, id);

  return (
    <div>
      <PageHeader
        title={`Proposal ${proposal.number}`}
        subtitle={proposal.customerName}
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Proposals", href: "/sales/proposals" },
          { label: proposal.number },
        ]}
        action={<Badge text={proposal.status} tone={statusTone[proposal.status]} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Proposal Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-400">Project Start</p>
              <p className="text-stone-700">{proposal.projectStartDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-400">Project End</p>
              <p className="text-stone-700">{proposal.projectEndDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-400">Amount</p>
              <p className="text-stone-700">{proposal.amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-400">Notes</p>
              <p className="text-stone-700">{proposal.notes || "—"}</p>
            </div>
          </div>

          {proposal.status === "draft" && (
            <form action={boundMarkSent} className="mt-4">
              <SubmitButton label="Mark as Sent to Customer" />
            </form>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Signed Proposal &amp; Service Contract</h3>
          <div className="mb-4 space-y-1 text-sm">
            <p className="text-stone-500">
              Signed proposal: {proposal.signedFileDataUrl ? <Badge text="Uploaded" tone="green" /> : <Badge text="Missing" tone="red" />}
            </p>
            <p className="text-stone-500">
              Service contract: {proposal.serviceContractFileDataUrl ? <Badge text="Uploaded" tone="green" /> : <Badge text="Missing" tone="red" />}
            </p>
          </div>
          <form action={boundUpload} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Signed Proposal (customer-signed copy)
              </label>
              <input type="file" name="signedFile" className="block w-full text-sm text-stone-600" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Service Contract</label>
              <input type="file" name="serviceContractFile" className="block w-full text-sm text-stone-600" />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Upload
            </button>
          </form>
          <p className="mt-3 text-xs text-stone-400">
            Uploading a signed proposal marks this proposal as &quot;signed&quot;, unlocking tax invoice issuance for
            this customer once the rest of the document checklist is complete.
          </p>
        </Card>
      </div>
    </div>
  );
}
