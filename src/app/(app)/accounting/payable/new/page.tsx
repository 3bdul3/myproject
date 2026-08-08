import { createBill } from "@/lib/actions/ap";
import { listPurchaseOrders, listSuppliers } from "@/lib/actions/inventory";
import { PageHeader, Card, Field, Select, SubmitButton } from "@/components/ui";

export default async function NewBillPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [suppliers, purchaseOrders] = await Promise.all([listSuppliers(), listPurchaseOrders()]);
  const receivedOrders = purchaseOrders.filter((po) => po.status === "received");

  return (
    <div>
      <PageHeader
        title="New Bill"
        subtitle="Record a supplier's tax invoice against Accounts Payable"
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Accounts Payable", href: "/accounting/payable" },
          { label: "New" },
        ]}
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        {suppliers.length === 0 ? (
          <p className="text-sm text-stone-400">Add a supplier first under Inventory &gt; Suppliers.</p>
        ) : (
          <form action={createBill} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Supplier"
                name="supplierId"
                required
                options={suppliers.map((s) => ({ value: s._id!, label: s.name }))}
              />
              <Field label="Supplier Invoice Number" name="supplierInvoiceNumber" required />
              <Select
                label="Related Purchase Order (optional)"
                name="purchaseOrderId"
                options={[
                  { value: "", label: "— None —" },
                  ...receivedOrders.map((po) => ({ value: po._id!, label: `${po.number} — ${po.supplierName} (${po.total.toFixed(2)})` })),
                ]}
              />
              <Field label="Bill Date" name="date" type="date" required />
              <Field label="Due Date" name="dueDate" type="date" required />
              <Field label="Subtotal (excl. VAT)" name="subtotal" type="number" step="0.01" required />
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" name="hasVat" className="h-4 w-4 rounded border-stone-300" />
              Supplier is VAT-registered (adds 15% input VAT, reclaimable from ZATCA)
            </label>

            <SubmitButton label="Create Bill" />
          </form>
        )}
      </Card>
    </div>
  );
}
