import { createAttendance, listAttendance, listEmployees } from "@/lib/actions/hr";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";

const statusTone: Record<string, "green" | "red" | "amber" | "slate"> = {
  present: "green",
  absent: "red",
  late: "amber",
  leave: "slate",
};

export default async function AttendancePage() {
  const [records, employees] = await Promise.all([listAttendance(), listEmployees()]);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Daily check-in and check-out log" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Check In</th>
                <th className="px-4 py-3">Check Out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 text-stone-500">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{r.employeeName}</td>
                  <td className="px-4 py-3 text-stone-500">{r.checkIn}</td>
                  <td className="px-4 py-3 text-stone-500">{r.checkOut}</td>
                  <td className="px-4 py-3">
                    <Badge text={r.status} tone={statusTone[r.status]} />
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ Log Attendance</summary>
              {employees.length === 0 ? (
                <p className="mt-3 text-sm text-stone-400">Add an employee first.</p>
              ) : (
                <form action={createAttendance} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    label="Employee"
                    name="employeeId"
                    options={employees.map((e) => ({ value: e._id!, label: e.name }))}
                  />
                  <Field label="Date" name="date" type="date" required />
                  <Field label="Check In" name="checkIn" type="time" />
                  <Field label="Check Out" name="checkOut" type="time" />
                  <Select
                    label="Status"
                    name="status"
                    options={[
                      { value: "present", label: "Present" },
                      { value: "absent", label: "Absent" },
                      { value: "late", label: "Late" },
                      { value: "leave", label: "Leave" },
                    ]}
                  />
                  <div className="flex justify-end sm:col-span-2">
                    <SubmitButton label="Save" />
                  </div>
                </form>
              )}
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
