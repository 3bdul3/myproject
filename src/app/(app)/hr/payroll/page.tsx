import { listPayroll, markPayrollPaid, runPayroll } from "@/lib/actions/hr";
import { PageHeader, Card, Field, SubmitButton, Badge } from "@/components/ui";

export default async function PayrollPage() {
  const records = await listPayroll();

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Monthly payroll runs" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Net Pay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((p) => (
                <tr key={p._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-800">{p.employeeName}</td>
                  <td className="px-4 py-3 text-stone-500">{p.month}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.baseSalary.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.deductions.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{p.netPay.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge text={p.status} tone={p.status === "paid" ? "green" : "amber"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "draft" && (
                      <form
                        action={async () => {
                          "use server";
                          await markPayrollPaid(p._id!);
                        }}
                      >
                        <button className="text-xs font-medium text-brand-600 hover:underline">Mark Paid</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                    No payroll runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Run Payroll</h3>
            <form action={runPayroll} className="space-y-3">
              <Field label="Month" name="month" type="month" required />
              <SubmitButton label="Run Payroll for Active Employees" />
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
