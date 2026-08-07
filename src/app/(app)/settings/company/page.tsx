import { getCompanySettings, updateCompanySettings } from "@/lib/actions/settings";
import { PageHeader, Card, Field, SubmitButton } from "@/components/ui";
import { SAUDI_ARABIA_BILINGUAL } from "@/lib/customer";

export default async function CompanySettingsPage() {
  const settings = await getCompanySettings();
  const addr = settings.nationalAddress;

  return (
    <div>
      <PageHeader
        title="Company Information"
        subtitle="Seller details printed on every tax invoice"
        breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Settings" }]}
      />

      <Card>
        <form action={updateCompanySettings} className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Company Logo
            </p>
            <div className="flex items-center gap-4">
              {settings.logoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={settings.logoDataUrl}
                  alt="Company logo"
                  className="h-16 w-16 rounded-lg border border-stone-200 object-contain p-1"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs text-stone-400">
                  No logo
                </div>
              )}
              <div>
                <input
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="block text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-700 hover:file:bg-stone-200"
                />
                <p className="mt-1 text-xs text-stone-400">PNG, JPEG, SVG or WebP. Shown on invoices and the app header.</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Company Identity
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Company Name (Arabic)" name="nameAr" defaultValue={settings.nameAr} required />
              <Field label="Company Name (English)" name="nameEn" defaultValue={settings.nameEn} required />
              <Field label="VAT Number" name="vatNumber" defaultValue={settings.vatNumber} required />
              <Field label="Commercial Registration" name="crNumber" defaultValue={settings.crNumber} required />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              National Address
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Building Number" name="buildingNumber" defaultValue={addr.buildingNumber} required />
              <Field label="Street" name="streetName" defaultValue={addr.streetName} required />
              <Field label="District" name="district" defaultValue={addr.district} required />
              <Field label="Additional Number" name="additionalNumber" defaultValue={addr.additionalNumber} required />
              <Field label="Zip Code" name="postalCode" defaultValue={addr.postalCode} required />
              <Field label="City" name="city" defaultValue={addr.city} required />
              <Field label="Unit Number (optional)" name="unitNumber" defaultValue={addr.unitNumber} />
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
              Bank Account Information
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Bank Name" name="bankName" defaultValue={settings.bankName} required />
              <Field label="Account Name" name="bankAccountName" defaultValue={settings.bankAccountName} required />
              <Field label="Account Number" name="bankAccountNumber" defaultValue={settings.bankAccountNumber} required />
              <Field label="IBAN" name="bankIban" defaultValue={settings.bankIban} required />
            </div>
          </div>

          <SubmitButton label="Save Company Information" />
        </form>
      </Card>
    </div>
  );
}
