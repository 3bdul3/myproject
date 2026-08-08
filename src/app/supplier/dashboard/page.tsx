import { requireSupplierAuth } from "@/lib/supplierAuth";
import { getMyBills, getMyPurchaseOrders } from "@/lib/actions/supplierPortal";
import { Card, Badge } from "@/components/ui";

const billStatusTone: Record<string, "green" | "amber" | "red" | "slate"> = {
  draft: "slate",
  posted: "amber",
  partial: "amber",
  paid: "green",
};

const poStatusTone: Record<string, "green" | "amber" | "red" | "slate"> = {
  ordered: "amber",
  received: "green",
  cancelled: "red",
};

export default async function SupplierDashboardPage() {
  await requireSupplierAuth();
  const [bills, orders] = await Promise.all([getMyBills(), getMyPurchaseOrders()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">Your purchase orders and bills with us</p>
      </div>

      <Card className="p-0 overflow-x-auto">
        <h2 className="border-b border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700">Purchase Orders</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium text-stone-800">{o.number}</td>
                <td className="px-4 py-3 text-stone-500">{o.date}</td>
                <td className="px-4 py-3 text-stone-500">{o.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge text={o.status} tone={poStatusTone[o.status]} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                  No purchase orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <h2 className="border-b border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700">Bills</h2>
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
            {bills.map((b) => (
              <tr key={b._id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium text-stone-800">{b.number}</td>
                <td className="px-4 py-3 text-stone-500">{b.date}</td>
                <td className="px-4 py-3 text-stone-500">{b.total.toFixed(2)}</td>
                <td className="px-4 py-3 text-stone-500">{b.amountPaid.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge text={b.status} tone={billStatusTone[b.status]} />
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                  No bills yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
