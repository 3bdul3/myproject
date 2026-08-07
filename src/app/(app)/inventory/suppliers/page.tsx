import { createSupplier, listSuppliers } from "@/lib/actions/inventory";
import { PageHeader, Card, Field, SubmitButton } from "@/components/ui";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Vendor directory" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">VAT No.</th>
                <th className="px-4 py-3">CR No.</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Address</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-800">{s.name}</td>
                  <td className="px-4 py-3 text-stone-500">{s.vatNumber || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{s.crNumber || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{s.email}</td>
                  <td className="px-4 py-3 text-stone-500">{s.phone}</td>
                  <td className="px-4 py-3 text-stone-500">{s.address}</td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No suppliers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Supplier</summary>
              <form action={createSupplier} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name" name="name" required />
                <Field label="VAT Number" name="vatNumber" placeholder="If VAT-registered" />
                <Field label="CR Number" name="crNumber" />
                <Field label="Email" name="email" type="email" />
                <Field label="Phone" name="phone" required />
                <Field label="Address" name="address" />
                <SubmitButton label="Add Supplier" />
              </form>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
