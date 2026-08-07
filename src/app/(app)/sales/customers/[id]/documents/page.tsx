import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions/crm";
import { getCustomerDocuments, uploadCustomerDocuments } from "@/lib/actions/documents";
import { getMissingRequirementsForTaxInvoice } from "@/lib/actions/accounting";
import { listProposals } from "@/lib/actions/proposals";
import { PageHeader, Card, Badge } from "@/components/ui";

function FileRow({ label, uploaded }: { label: string; uploaded: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-2 last:border-0">
      <span className="text-sm text-stone-700">{label}</span>
      <Badge text={uploaded ? "Uploaded" : "Missing"} tone={uploaded ? "green" : "red"} />
    </div>
  );
}

export default async function CustomerDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, docs, proposals] = await Promise.all([
    getCustomer(id),
    getCustomerDocuments(id),
    listProposals(),
  ]);
  if (!customer) notFound();

  const customerProposals = proposals.filter((p) => p.customerId === id);
  const signedProposal = customerProposals.find((p) => p.status === "signed");
  const missing = await getMissingRequirementsForTaxInvoice(id, signedProposal?._id ?? "");

  const boundUpload = uploadCustomerDocuments.bind(null, id);

  return (
    <div>
      <PageHeader
        title={`Documents — ${customer.nameAr} / ${customer.nameEn}`}
        subtitle="Required before a tax invoice can be issued for this customer"
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Customers", href: "/sales/customers" },
          { label: "Documents" },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Checklist Status</h3>
          <FileRow label="Commercial Registration / National ID" uploaded={!!customer.crNumber || !!docs.crOrNationalIdFileDataUrl} />
          <FileRow
            label="National Address"
            uploaded={!!(
              customer.nationalAddress?.buildingNumber &&
              customer.nationalAddress?.streetName &&
              customer.nationalAddress?.district &&
              customer.nationalAddress?.city &&
              customer.nationalAddress?.postalCode
            )}
          />
          <FileRow label="Tax Certificate (if applicable)" uploaded={!!docs.taxCertificateFileDataUrl} />
          <FileRow label="KYC Form" uploaded={!!docs.kycFileDataUrl} />
          <FileRow label="Signed Proposal" uploaded={!!signedProposal} />
          <FileRow label="Service Contract" uploaded={!!signedProposal?.serviceContractFileDataUrl} />

          <div className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            {missing.length === 0
              ? "All requirements are complete — a tax invoice can be issued for this customer."
              : `Still missing: ${missing.join(", ")}`}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Upload Documents</h3>
          <form action={boundUpload} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Commercial Registration / National ID
              </label>
              <input type="file" name="crOrNationalIdFile" className="block w-full text-sm text-stone-600" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Tax Certificate</label>
              <input type="file" name="taxCertificateFile" className="block w-full text-sm text-stone-600" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">KYC Form</label>
              <input type="file" name="kycFile" className="block w-full text-sm text-stone-600" />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Save Documents
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
