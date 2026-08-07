import { createWarehouse, listWarehouses } from "@/lib/actions/inventory";
import { PageHeader, Card, Field, SubmitButton } from "@/components/ui";

export default async function WarehousesPage() {
  const warehouses = await listWarehouses();

  return (
    <div>
      <PageHeader title="Warehouses" subtitle="Storage locations" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {warehouses.map((w) => (
            <Card key={w._id}>
              <p className="font-semibold text-stone-800">{w.name}</p>
              <p className="text-sm text-stone-500">{w.location}</p>
            </Card>
          ))}
          {warehouses.length === 0 && <p className="text-sm text-stone-400">No warehouses yet.</p>}
        </div>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Warehouse</summary>
              <form action={createWarehouse} className="mt-4 grid grid-cols-1 gap-3">
                <Field label="Name" name="name" required />
                <Field label="Location" name="location" required />
                <SubmitButton label="Add Warehouse" />
              </form>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
