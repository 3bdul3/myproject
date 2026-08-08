import { requireCustomerAuth } from "@/lib/customerAuth";
import { getMyCustomerDocuments, uploadMyCustomerDocuments } from "@/lib/actions/customerPortal";
import { Card, Badge } from "@/components/ui";

function FileRow({ label, uploaded }: { label: string; uploaded: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-2 last:border-0">
      <span className="text-sm text-stone-700">{label}</span>
      <Badge text={uploaded ? "Uploaded" : "Missing"} tone={uploaded ? "green" : "red"} />
    </div>
  );
}

export default async function CustomerDocumentsPage() {
  await requireCustomerAuth();
  const docs = await getMyCustomerDocuments();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Checklist Status</h3>
        <FileRow label="Commercial Registration / National ID" uploaded={!!docs.crOrNationalIdFileDataUrl} />
        <FileRow label="Tax Certificate (if applicable)" uploaded={!!docs.taxCertificateFileDataUrl} />
        <FileRow label="KYC Form" uploaded={!!docs.kycFileDataUrl} />
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Upload Documents</h3>
        <form action={uploadMyCustomerDocuments} className="space-y-3">
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
  );
}
