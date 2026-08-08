import Link from "next/link";
import {
  createCustomer,
  deleteCustomer,
  restoreCustomer,
  importCustomersFromExcel,
  listCustomers,
  listArchivedCustomers,
  setCustomerPortalCredentials,
  setCustomerPortalActive,
  setCustomerSuspended,
} from "@/lib/actions/crm";
import { PageHeader, Card, Field, SubmitButton, Badge } from "@/components/ui";
import { SAUDI_ARABIA_BILINGUAL } from "@/lib/customer";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; view?: string }>;
}) {
  const { error, view } = await searchParams;
  const showArchived = view === "archived";
  const customers = showArchived ? await listArchivedCustomers() : await listCustomers();

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer relationship and tax compliance records"
        action={
          <Link
            href={showArchived ? "/sales/customers" : "/sales/customers?view=archived"}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            {showArchived ? "Back to active customers" : "View archived"}
          </Link>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name (AR / EN)</th>
                <th className="px-4 py-3">VAT No.</th>
                <th className="px-4 py-3">CR No.</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Invoice Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Portal Access</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-stone-500">{c.customerCode || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800">{c.nameAr}</p>
                    <p className="text-stone-500">{c.nameEn}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{c.vatNumber || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{c.crNumber || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">
                    <p>{c.contactName}</p>
                    <p>{c.contactMobile}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{c.invoiceEmail}</td>
                  <td className="px-4 py-3">
                    {showArchived ? (
                      <Badge text="Archived" tone="slate" />
                    ) : (
                      <form action={setCustomerSuspended.bind(null, c._id!, !c.suspended)} className="flex items-center gap-1.5">
                        <Badge text={c.suspended ? "Suspended" : "Active"} tone={c.suspended ? "red" : "green"} />
                        <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                          {c.suspended ? "Reactivate" : "Suspend"}
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.portalUsername ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-stone-600">{c.portalUsername}</span>
                          <Badge text={c.portalActive ? "Active" : "Disabled"} tone={c.portalActive ? "green" : "slate"} />
                        </div>
                        <form action={setCustomerPortalActive.bind(null, c._id!, !c.portalActive)}>
                          <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                            {c.portalActive ? "Disable" : "Enable"}
                          </button>
                        </form>
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-brand-600">Reset password</summary>
                          <form action={setCustomerPortalCredentials.bind(null, c._id!)} className="mt-2 space-y-1.5">
                            <input
                              type="text"
                              name="portalUsername"
                              defaultValue={c.portalUsername}
                              required
                              className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                            />
                            <input
                              type="password"
                              name="portalPassword"
                              placeholder="New password"
                              required
                              className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                            />
                            <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                              Save
                            </button>
                          </form>
                        </details>
                      </div>
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-brand-600">Set up access</summary>
                        <form action={setCustomerPortalCredentials.bind(null, c._id!)} className="mt-2 space-y-1.5">
                          <input
                            type="text"
                            name="portalUsername"
                            placeholder="Username"
                            required
                            className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                          />
                          <input
                            type="password"
                            name="portalPassword"
                            placeholder="Password"
                            required
                            className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                          />
                          <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                            Create login
                          </button>
                        </form>
                      </details>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!showArchived && (
                        <>
                          <Link
                            href={`/sales/customers/${c._id}/statement`}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Statement
                          </Link>
                          <Link
                            href={`/sales/customers/${c._id}/documents`}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Documents
                          </Link>
                        </>
                      )}
                      <form
                        action={async () => {
                          "use server";
                          if (showArchived) await restoreCustomer(c._id!);
                          else await deleteCustomer(c._id!);
                        }}
                      >
                        <button className={`text-xs hover:underline ${showArchived ? "text-brand-600" : "text-red-500"}`}>
                          {showArchived ? "Restore" : "Delete"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-400">
                    {showArchived ? "No archived customers." : "No customers yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Customer</summary>
              <form action={createCustomer} className="mt-4 space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    Customer Identity
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Customer Name (Arabic)" name="nameAr" required />
                    <Field label="Customer Name (English)" name="nameEn" required />
                    <Field label="VAT Number (if any)" name="vatNumber" />
                    <Field label="Commercial Registration (if any)" name="crNumber" />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    National Address
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Building Number" name="buildingNumber" required />
                    <Field label="Street" name="streetName" required />
                    <Field label="District" name="district" required />
                    <Field label="Additional Number" name="additionalNumber" required />
                    <Field label="Zip Code" name="postalCode" required />
                    <Field label="City" name="city" required />
                    <Field label="Unit Number (optional)" name="unitNumber" />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">Country</label>
                      <input
                        disabled
                        dir="auto"
                        value={SAUDI_ARABIA_BILINGUAL}
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    Contact Information
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Contact Name" name="contactName" required />
                    <Field label="Contact Email" name="contactEmail" type="email" required />
                    <Field label="Mobile Number" name="contactMobile" required />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    Invoicing Emails
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Primary Invoice Email" name="invoiceEmail" type="email" required />
                    <Field label="Info Email (optional)" name="infoEmail" type="email" />
                  </div>
                </div>

                <SubmitButton label="Add Customer" />
              </form>
            </details>
          </Card>

          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">
                + Import Customers from Excel
              </summary>
              <div className="mt-4 space-y-3">
                <p className="text-sm text-stone-500">
                  Upload an Excel file to bulk-create customers. Customer codes are assigned automatically — the
                  template shows a live preview of each code as you fill in a row.
                </p>
                <a
                  href="/api/customers/excel-template"
                  className="inline-block text-xs font-medium text-brand-600 hover:underline"
                >
                  Download Excel template
                </a>
                <form action={importCustomersFromExcel} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600">Excel File</label>
                    <input
                      type="file"
                      name="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      required
                      className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-700 hover:file:bg-stone-200"
                    />
                  </div>
                  <SubmitButton label="Import" />
                </form>
              </div>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
