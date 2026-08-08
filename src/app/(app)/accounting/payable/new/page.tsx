import { createBill } from "@/lib/actions/ap";
import { listPurchaseOrders, listSuppliers } from "@/lib/actions/inventory";
import { PageHeader, Card, Field, Select, SubmitButton } from "@/components/ui";
import { TAX_RATES } from "@/lib/constants";

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
              <Select
                label="Input VAT Rate"
                name="vatRate"
                defaultValue="0.15"
                options={TAX_RATES.map((rate) => ({ value: String(rate), label: `${(rate * 100).toFixed(0)}%` }))}
              />
            </div>
            <p className="text-xs text-stone-500">
              VAT charged by a VAT-registered supplier is reclaimable input VAT — choose 0% if the supplier isn&apos;t
              VAT-registered.
            </p>

            <SubmitButton label="Create Bill" />
          </form>
        )}
      </Card>
    </div>
  );
}
