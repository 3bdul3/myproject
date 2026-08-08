import { requireRole } from "@/lib/authz";
import { listCompanies, createCompany, setActiveCompany } from "@/lib/actions/companies";
import { PageHeader, Card, Field, SubmitButton, Badge } from "@/components/ui";

export default async function CompaniesPage() {
  await requireRole(["admin"]);
  const companies = await listCompanies();

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Businesses managed under this account — each has fully separate books"
        breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Settings" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Name (AR / EN)</th>
                <th className="px-4 py-3">VAT No.</th>
                <th className="px-4 py-3">CR No.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800">{c.nameEn || "—"}</p>
                    <p className="text-stone-500">{c.nameAr}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{c.vatNumber || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{c.crNumber || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await setActiveCompany(c._id!);
                      }}
                    >
                      <button className="text-xs font-medium text-brand-600 hover:underline">
                        Switch &amp; Edit Details
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                    No companies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">+ New Company</h3>
            <form action={createCompany} className="space-y-3">
              <Field label="Company Name (Arabic)" name="nameAr" required />
              <Field label="Company Name (English)" name="nameEn" required />
              <Field label="VAT Number" name="vatNumber" />
              <Field label="Commercial Registration" name="crNumber" />
              <SubmitButton label="Create Company" />
              <p className="text-xs text-stone-400">
                Starts empty — no chart of accounts, products, or employees. Add the rest of its details
                (address, bank info, logo) under Company Info after switching to it.
              </p>
            </form>
          </Card>
          <Badge text="admin only" tone="slate" />
        </div>
      </div>
    </div>
  );
}
