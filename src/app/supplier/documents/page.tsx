import { requireSupplierAuth } from "@/lib/supplierAuth";
import { getMySupplierDocuments, uploadSupplierDocuments } from "@/lib/actions/supplierPortal";
import { Card, Badge } from "@/components/ui";

function FileRow({ label, uploaded }: { label: string; uploaded: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-2 last:border-0">
      <span className="text-sm text-stone-700">{label}</span>
      <Badge text={uploaded ? "Uploaded" : "Missing"} tone={uploaded ? "green" : "red"} />
    </div>
  );
}

export default async function SupplierDocumentsPage() {
  await requireSupplierAuth();
  const docs = await getMySupplierDocuments();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Checklist Status</h3>
        <FileRow label="Commercial Registration" uploaded={!!docs.crFileDataUrl} />
        <FileRow label="VAT Certificate" uploaded={!!docs.vatCertificateFileDataUrl} />
        <FileRow label="Bank Letter" uploaded={!!docs.bankLetterFileDataUrl} />
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Upload Documents</h3>
        <form action={uploadSupplierDocuments} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Commercial Registration</label>
            <input type="file" name="crFile" className="block w-full text-sm text-stone-600" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">VAT Certificate</label>
            <input type="file" name="vatCertificateFile" className="block w-full text-sm text-stone-600" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Bank Letter</label>
            <input type="file" name="bankLetterFile" className="block w-full text-sm text-stone-600" />
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
