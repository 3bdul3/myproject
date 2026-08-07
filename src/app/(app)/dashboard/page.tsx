import Link from "next/link";
import { getArSummary, getFinancialSummary, listInvoicesByType } from "@/lib/actions/accounting";
import { listCustomers, listLeads, listSalesOrders } from "@/lib/actions/crm";
import { getStockLevels, listPurchaseOrders } from "@/lib/actions/inventory";
import { listEmployees } from "@/lib/actions/hr";
import { PageHeader, Card, StatCard, Badge } from "@/components/ui";

export default async function DashboardPage() {
  const [summary, arSummary, taxInvoices, customers, leads, orders, stockLevels, purchaseOrders, employees] =
    await Promise.all([
      getFinancialSummary(),
      getArSummary(),
      listInvoicesByType("tax"),
      listCustomers(),
      listLeads(),
      listSalesOrders(),
      getStockLevels(),
      listPurchaseOrders(),
      listEmployees(),
    ]);

  const lowStockItems = stockLevels.filter((s) => s.lowStock);
  const openLeads = leads.filter((l) => l.status === "new" || l.status === "qualified");
  const activeEmployees = employees.filter((e) => e.status === "active");
  const pendingPOs = purchaseOrders.filter((p) => p.status !== "received");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Company-wide overview across all modules"
        breadcrumb={[{ label: "Home" }]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net Income"
          value={summary.netIncome.toFixed(2)}
          hint="Accounting"
          icon="💰"
          tone={summary.netIncome >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Outstanding Receivables"
          value={arSummary.arBalance.toFixed(2)}
          hint="Accounting"
          icon="🧾"
          tone="amber"
        />
        <StatCard label="Customers" value={String(customers.length)} hint="Sales & CRM" icon="🧑‍💼" tone="indigo" />
        <StatCard label="Open Leads" value={String(openLeads.length)} hint="Sales & CRM" icon="🎯" tone="indigo" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sales Orders" value={String(orders.length)} hint="Sales & CRM" icon="🛒" tone="indigo" />
        <StatCard
          label="Low Stock Items"
          value={String(lowStockItems.length)}
          hint="Inventory"
          icon="📦"
          tone={lowStockItems.length > 0 ? "red" : "green"}
        />
        <StatCard
          label="Pending Purchase Orders"
          value={String(pendingPOs.length)}
          hint="Inventory"
          icon="📥"
          tone="amber"
        />
        <StatCard label="Active Employees" value={String(activeEmployees.length)} hint="HR" icon="👥" tone="slate" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">Recent Tax Invoices</h3>
            <Link href="/accounting/invoices" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {taxInvoices.slice(0, 5).map((inv) => (
              <div key={inv._id} className="flex items-center justify-between text-sm">
                <span className="text-stone-600">
                  {inv.number} · {inv.customerName}
                </span>
                <span className="font-mono">{inv.total.toFixed(2)}</span>
              </div>
            ))}
            {taxInvoices.length === 0 && <p className="text-sm text-stone-400">No invoices yet.</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">Low Stock Alerts</h3>
            <Link href="/inventory/products" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map(({ product, quantity }) => (
              <div key={product._id} className="flex items-center justify-between text-sm">
                <span className="text-stone-600">{product.name}</span>
                <Badge text={`${quantity} left`} tone="red" />
              </div>
            ))}
            {lowStockItems.length === 0 && <p className="text-sm text-stone-400">Stock levels healthy.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
