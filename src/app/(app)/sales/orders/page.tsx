import { confirmSalesOrder, createSalesOrder, listCustomers, listProductsForSelect, listSalesOrders } from "@/lib/actions/crm";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";
import ProductLineItemsInput from "@/components/ProductLineItemsInput";

const statusTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  draft: "slate",
  confirmed: "indigo",
  invoiced: "green",
  cancelled: "red",
};

export default async function SalesOrdersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [orders, customers, products] = await Promise.all([
    listSalesOrders(),
    listCustomers(),
    listProductsForSelect(),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Confirming an order deducts stock. Issue the tax invoice from Accounting once the matching Proposal is signed."
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
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-800">{o.number}</td>
                  <td className="px-4 py-3 text-stone-500">{o.customerName}</td>
                  <td className="px-4 py-3 text-stone-500">{o.date}</td>
                  <td className="px-4 py-3 text-right font-mono">{o.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge text={o.status} tone={statusTone[o.status]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.status === "draft" && (
                      <form
                        action={async () => {
                          "use server";
                          await confirmSalesOrder(o._id!);
                        }}
                      >
                        <button className="text-xs font-medium text-brand-600 hover:underline">Confirm</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No sales orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Sales Order</summary>
              {products.length === 0 ? (
                <p className="mt-3 text-sm text-stone-400">
                  Add at least one product in Inventory before creating a sales order.
                </p>
              ) : (
                <form action={createSalesOrder} className="mt-4 space-y-4">
                  <Select
                    label="Customer"
                    name="customerId"
                    required
                    options={customers.map((c) => ({
                      value: c._id!,
                      label: `${c.customerCode ?? "—"} — ${c.nameAr} / ${c.nameEn}`,
                    }))}
                  />
                  <Field label="Date" name="date" type="date" required />
                  <ProductLineItemsInput products={products} priceField="salePrice" />
                  <SubmitButton label="Create Order" />
                </form>
              )}
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
