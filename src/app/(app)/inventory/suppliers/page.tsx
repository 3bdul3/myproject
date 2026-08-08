import {
  createSupplier,
  listSuppliers,
  setSupplierPortalCredentials,
  setSupplierPortalActive,
  setSupplierSuspended,
} from "@/lib/actions/inventory";
import { PageHeader, Card, Field, SubmitButton, Badge } from "@/components/ui";
import PasswordField from "@/components/PasswordField";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const suppliers = await listSuppliers();

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Vendor directory" />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Portal Access</th>
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
                  <td className="px-4 py-3">
                    <form action={setSupplierSuspended.bind(null, s._id!, !s.suspended)} className="flex items-center gap-1.5">
                      <Badge text={s.suspended ? "Suspended" : "Active"} tone={s.suspended ? "red" : "green"} />
                      <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                        {s.suspended ? "Reactivate" : "Suspend"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    {s.portalUsername ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-stone-600">{s.portalUsername}</span>
                          <Badge text={s.portalActive ? "Active" : "Disabled"} tone={s.portalActive ? "green" : "slate"} />
                        </div>
                        <form action={setSupplierPortalActive.bind(null, s._id!, !s.portalActive)}>
                          <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                            {s.portalActive ? "Disable" : "Enable"}
                          </button>
                        </form>
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-brand-600">Reset password</summary>
                          <form action={setSupplierPortalCredentials.bind(null, s._id!)} className="mt-2 space-y-1.5">
                            <input
                              type="text"
                              name="portalUsername"
                              defaultValue={s.portalUsername}
                              required
                              className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                            />
                            <PasswordField name="portalPassword" placeholder="New password" required compact />
                            <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                              Save
                            </button>
                          </form>
                        </details>
                      </div>
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-brand-600">Set up access</summary>
                        <form action={setSupplierPortalCredentials.bind(null, s._id!)} className="mt-2 space-y-1.5">
                          <input
                            type="text"
                            name="portalUsername"
                            placeholder="Username"
                            required
                            className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                          />
                          <PasswordField name="portalPassword" placeholder="Password" required compact />
                          <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                            Create login
                          </button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
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
