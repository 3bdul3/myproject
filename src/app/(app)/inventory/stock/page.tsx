import { createStockMovement, listStockMovements, listProducts, listWarehouses } from "@/lib/actions/inventory";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";

export default async function StockPage() {
  const [movements, products, warehouses] = await Promise.all([
    listStockMovements(),
    listProducts(),
    listWarehouses(),
  ]);

  const typeTone: Record<string, "green" | "red" | "slate"> = {
    in: "green",
    out: "red",
    adjust: "slate",
  };

  return (
    <div>
      <PageHeader title="Stock Movements" subtitle="Inventory ledger across warehouses" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 text-stone-500">{m.date}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{m.productName}</td>
                  <td className="px-4 py-3">
                    <Badge text={m.type} tone={typeTone[m.type]} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{m.qty}</td>
                  <td className="px-4 py-3 text-stone-500">{m.ref}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                    No stock movements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Movement</summary>
              {products.length === 0 || warehouses.length === 0 ? (
                <p className="mt-3 text-sm text-stone-400">Add a product and a warehouse first.</p>
              ) : (
                <form action={createStockMovement} className="mt-4 grid grid-cols-1 gap-3">
                  <Select
                    label="Product"
                    name="productId"
                    options={products.map((p) => ({ value: p._id!, label: p.name }))}
                  />
                  <Select
                    label="Warehouse"
                    name="warehouseId"
                    options={warehouses.map((w) => ({ value: w._id!, label: w.name }))}
                  />
                  <Select
                    label="Type"
                    name="type"
                    options={[
                      { value: "in", label: "Stock In" },
                      { value: "out", label: "Stock Out" },
                      { value: "adjust", label: "Adjustment" },
                    ]}
                  />
                  <Field label="Quantity" name="qty" type="number" required />
                  <Field label="Reference" name="ref" placeholder="Optional note" />
                  <SubmitButton label="Record Movement" />
                </form>
              )}
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
