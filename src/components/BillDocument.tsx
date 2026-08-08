import type { Bill, CompanySettings, Supplier } from "@/types";

export default function BillDocument({
  bill,
  supplier,
  company,
}: {
  bill: Bill;
  supplier: Supplier | null | undefined;
  company: CompanySettings;
}) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-stone-900">
      <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h1 className="text-lg font-bold">Supplier Bill</h1>
          <p className="text-sm text-stone-500">{bill.number}</p>
        </div>
        {company.logoDataUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={company.logoDataUrl} alt="Company logo" className="max-h-14 max-w-14 object-contain" />
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Bill To</p>
          <p className="text-sm font-semibold text-stone-900">{company.nameEn || company.nameAr}</p>
          <p className="text-xs text-stone-500">VAT: {company.vatNumber || "—"}</p>
        </div>
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Supplier</p>
          <p className="text-sm font-semibold text-stone-900">{supplier?.name || bill.supplierName}</p>
          <p className="text-xs text-stone-500">VAT: {supplier?.vatNumber || "—"}</p>
          <p className="text-xs text-stone-500">{supplier?.email}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-3 text-sm">
        <div className="flex justify-between border-b border-stone-100 py-1.5">
          <span className="text-stone-500">Supplier Invoice No.</span>
          <span className="font-medium">{bill.supplierInvoiceNumber}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 py-1.5">
          <span className="text-stone-500">Date</span>
          <span className="font-medium">{bill.date}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 py-1.5">
          <span className="text-stone-500">Due Date</span>
          <span className="font-medium">{bill.dueDate}</span>
        </div>
        {bill.purchaseOrderNumber && (
          <div className="flex justify-between py-1.5">
            <span className="text-stone-500">Purchase Order</span>
            <span className="font-medium">{bill.purchaseOrderNumber}</span>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-3">
        <div className="ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span className="font-mono">{bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.hasVat && (
            <div className="flex justify-between text-stone-500">
              <span>VAT ({((bill.vatRate ?? 0.15) * 100).toFixed(0)}%)</span>
              <span className="font-mono">{bill.vat.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-1 font-semibold text-stone-800">
            <span>Total</span>
            <span className="font-mono">{bill.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Paid</span>
            <span className="font-mono">{bill.amountPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-stone-800">
            <span>Balance</span>
            <span className="font-mono">{(bill.total - bill.amountPaid).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
