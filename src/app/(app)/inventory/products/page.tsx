import { createProduct, deleteProduct } from "@/lib/actions/inventory";
import { getStockLevels } from "@/lib/actions/inventory";
import { PageHeader, Card, Field, SubmitButton, Badge } from "@/components/ui";

export default async function ProductsPage() {
  const stockLevels = await getStockLevels();

  return (
    <div>
      <PageHeader title="Products" subtitle="Product catalog and pricing" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stockLevels.map(({ product: p, quantity, lowStock }) => (
                <tr key={p._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-stone-500">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{p.name}</td>
                  <td className="px-4 py-3 text-stone-500">{p.category}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.costPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.salePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={lowStock ? "font-semibold text-red-600" : ""}>{quantity}</span>{" "}
                    {lowStock ? <Badge text="low stock" tone="red" /> : <Badge text="healthy" tone="green" />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await deleteProduct(p._id!);
                      }}
                    >
                      <button className="text-xs text-red-500 hover:underline">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
              {stockLevels.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Product</summary>
              <form action={createProduct} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="SKU" name="sku" required />
                <Field label="Name" name="name" required />
                <Field label="Category" name="category" />
                <Field label="Unit" name="unit" placeholder="pcs, kg..." />
                <Field label="Cost Price" name="costPrice" type="number" step="0.01" required />
                <Field label="Sale Price" name="salePrice" type="number" step="0.01" required />
                <Field label="Reorder Level" name="reorderLevel" type="number" />
                <SubmitButton label="Add Product" />
              </form>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
