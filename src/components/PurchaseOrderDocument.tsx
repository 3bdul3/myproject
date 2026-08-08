import type { CompanySettings, PurchaseOrder, Supplier } from "@/types";

export default function PurchaseOrderDocument({
  order,
  supplier,
  company,
}: {
  order: PurchaseOrder;
  supplier: Supplier | null | undefined;
  company: CompanySettings;
}) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-stone-900">
      <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h1 className="text-lg font-bold">Purchase Order</h1>
          <p className="text-sm text-stone-500">{order.number}</p>
        </div>
        {company.logoDataUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={company.logoDataUrl} alt="Company logo" className="max-h-14 max-w-14 object-contain" />
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">From</p>
          <p className="text-sm font-semibold text-stone-900">{company.nameEn || company.nameAr}</p>
          <p className="text-xs text-stone-500">VAT: {company.vatNumber || "—"}</p>
        </div>
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Supplier</p>
          <p className="text-sm font-semibold text-stone-900">{supplier?.name || order.supplierName}</p>
          <p className="text-xs text-stone-500">VAT: {supplier?.vatNumber || "—"}</p>
          <p className="text-xs text-stone-500">{supplier?.email}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-3 text-sm">
        <div className="flex justify-between border-b border-stone-100 py-1.5">
          <span className="text-stone-500">Date</span>
          <span className="font-medium">{order.date}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-stone-500">Status</span>
          <span className="font-medium capitalize">{order.status}</span>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-3">
        <table className="w-full text-xs">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="py-2 text-left font-medium">Item</th>
              <th className="py-2 text-right font-medium">Cost</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} className="border-b border-stone-100 last:border-0">
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-right font-mono">{item.cost.toFixed(2)}</td>
                <td className="py-2 text-right">{item.qty}</td>
                <td className="py-2 text-right font-mono">{(item.cost * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between border-t border-stone-200 pt-1 font-semibold text-stone-800">
            <span>Total</span>
            <span className="font-mono">{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
