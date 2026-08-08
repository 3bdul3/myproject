import { requireCustomerAuth } from "@/lib/customerAuth";
import { getMyInvoices } from "@/lib/actions/customerPortal";
import { Card, Badge } from "@/components/ui";

const statusTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  posted: "indigo",
  partial: "amber",
  paid: "green",
  void: "red",
  converted: "slate",
};

export default async function CustomerDashboardPage() {
  await requireCustomerAuth();
  const invoices = await getMyInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">Your tax invoices with us</p>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv._id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium text-stone-800">{inv.number}</td>
                <td className="px-4 py-3 text-stone-500">{inv.date}</td>
                <td className="px-4 py-3 text-stone-500">{inv.total.toFixed(2)}</td>
                <td className="px-4 py-3 text-stone-500">{inv.amountPaid.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge text={inv.status} tone={statusTone[inv.status]} />
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
