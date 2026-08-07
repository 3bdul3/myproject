import { createEmployee, listDepartments, listEmployees, updateEmployeeStatus } from "@/lib/actions/hr";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";

const statusTone: Record<string, "green" | "red" | "amber"> = {
  active: "green",
  on_leave: "amber",
  terminated: "red",
};

export default async function EmployeesPage() {
  const [employees, departments] = await Promise.all([listEmployees(), listDepartments()]);

  return (
    <div>
      <PageHeader title="Employees" subtitle="Workforce directory" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 text-right">Salary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-800">{e.name}</td>
                  <td className="px-4 py-3 text-stone-500">{e.department}</td>
                  <td className="px-4 py-3 text-stone-500">{e.position}</td>
                  <td className="px-4 py-3 text-right font-mono">{e.salary.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge text={e.status} tone={statusTone[e.status]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.status === "active" ? (
                      <form
                        action={async () => {
                          "use server";
                          await updateEmployeeStatus(e._id!, "on_leave");
                        }}
                      >
                        <button className="text-xs text-amber-600 hover:underline">Set On Leave</button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          await updateEmployeeStatus(e._id!, "active");
                        }}
                      >
                        <button className="text-xs text-emerald-600 hover:underline">Set Active</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Employee</summary>
              <form action={createEmployee} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
                <Field label="Phone" name="phone" required />
                <Select
                  label="Department"
                  name="department"
                  options={departments.map((d) => ({ value: d.name, label: d.name }))}
                />
                <Field label="Position" name="position" required />
                <Field label="Hire Date" name="hireDate" type="date" required />
                <Field label="Salary" name="salary" type="number" step="0.01" required />
                <div className="flex items-end">
                  <SubmitButton label="Add Employee" />
                </div>
              </form>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
