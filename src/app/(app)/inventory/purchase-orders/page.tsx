import {
  createPurchaseOrder,
  listPurchaseOrders,
  listProducts,
  listSuppliers,
  listWarehouses,
  receivePurchaseOrder,
  sendPurchaseOrderToSupplier,
} from "@/lib/actions/inventory";
import { getApprovalRequestFor } from "@/lib/actions/approvals";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";
import ProductLineItemsInput from "@/components/ProductLineItemsInput";

const statusTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  draft: "slate",
  ordered: "amber",
  received: "green",
  cancelled: "red",
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [orders, suppliers, warehouses, products] = await Promise.all([
    listPurchaseOrders(),
    listSuppliers(),
    listWarehouses(),
    listProducts(),
  ]);

  const draftOrders = orders.filter((o) => o.status === "draft");
  const approvalEntries = await Promise.all(
    draftOrders.map(async (o) => [o._id, await getApprovalRequestFor("purchase_order", o._id!)] as const)
  );
  const approvalByOrderId = new Map(approvalEntries);

  const canCreate = suppliers.length > 0 && warehouses.length > 0 && products.length > 0;

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Receiving a PO updates stock. Record the supplier's Bill under Accounting > Accounts Payable to book what's owed."
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const approval = approvalByOrderId.get(o._id);
                const pending = approval && approval.status === "pending";
                const rejected = approval && approval.status === "rejected";
                return (
                  <tr key={o._id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-800">{o.number}</td>
                    <td className="px-4 py-3 text-stone-500">{o.supplierName}</td>
                    <td className="px-4 py-3 text-stone-500">{o.date}</td>
                    <td className="px-4 py-3 text-right font-mono">{o.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge text={o.status} tone={statusTone[o.status]} />
                        {pending && <Badge text="approval pending" tone="amber" />}
                        {rejected && <Badge text="approval rejected" tone="red" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`/api/purchase-orders/${o.number}/pdf`}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          PDF
                        </a>
                        {o.status === "draft" && (
                          <form
                            action={async () => {
                              "use server";
                              await sendPurchaseOrderToSupplier(o._id!);
                            }}
                          >
                            <button className="text-xs font-medium text-brand-600 hover:underline">
                              Send to Supplier
                            </button>
                          </form>
                        )}
                        {o.status !== "received" && (
                          <form
                            action={async () => {
                              "use server";
                              await receivePurchaseOrder(o._id!);
                            }}
                          >
                            <button className="text-xs font-medium text-brand-600 hover:underline">
                              Mark Received
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No purchase orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Purchase Order</summary>
              {!canCreate ? (
                <p className="mt-3 text-sm text-stone-400">
                  Add at least one supplier, warehouse, and product first.
                </p>
              ) : (
                <form action={createPurchaseOrder} className="mt-4 space-y-4">
                  <Select
                    label="Supplier"
                    name="supplierId"
                    required
                    options={suppliers.map((s) => ({ value: s._id!, label: s.name }))}
                  />
                  <Select
                    label="Warehouse"
                    name="warehouseId"
                    required
                    options={warehouses.map((w) => ({ value: w._id!, label: w.name }))}
                  />
                  <Field label="Date" name="date" type="date" required />
                  <ProductLineItemsInput products={products} priceField="costPrice" />
                  <SubmitButton label="Create Purchase Order" />
                </form>
              )}
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
