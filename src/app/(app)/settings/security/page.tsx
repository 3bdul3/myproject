import { getMyTotpStatus } from "@/lib/actions/twoFactor";
import { PageHeader, Card } from "@/components/ui";
import TwoFactorSettings from "@/components/TwoFactorSettings";

export default async function SecuritySettingsPage() {
  const { enabled } = await getMyTotpStatus();

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Manage two-factor authentication for your own login"
        breadcrumb={[{ label: "Home", href: "/dashboard" }]}
      />

      <Card className="max-w-md">
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Two-Factor Authentication</h3>
        <TwoFactorSettings enabled={enabled} />
      </Card>
    </div>
  );
}
