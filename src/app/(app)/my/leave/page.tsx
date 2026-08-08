import { getMyEmployeeRecord, submitLeaveRequest, listMyLeaveRequests } from "@/lib/actions/leave";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";

const statusTone: Record<string, "green" | "red" | "amber"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export default async function MyLeavePage() {
  const [employee, myRequests] = await Promise.all([getMyEmployeeRecord(), listMyLeaveRequests()]);

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        subtitle="Submit and track your own leave requests"
        breadcrumb={[{ label: "Home", href: "/dashboard" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((r) => (
                <tr key={r._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-800">{r.leaveType}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {r.startDate} to {r.endDate}
                  </td>
                  <td className="px-4 py-3">
                    <Badge text={r.status} tone={statusTone[r.status]} />
                  </td>
                  <td className="px-4 py-3 text-stone-500">{r.note || "—"}</td>
                </tr>
              ))}
              {myRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                    No leave requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Request Leave</h3>
            {!employee ? (
              <p className="text-sm text-stone-400">
                Your login isn&apos;t linked to an employee record yet — ask an admin to link it under Settings &gt;
                Users before you can request leave.
              </p>
            ) : (
              <form action={submitLeaveRequest} className="space-y-3">
                <Select
                  label="Type"
                  name="leaveType"
                  defaultValue="Annual"
                  options={[
                    { value: "Annual", label: "Annual" },
                    { value: "Sick", label: "Sick" },
                    { value: "Unpaid", label: "Unpaid" },
                    { value: "Other", label: "Other" },
                  ]}
                />
                <Field label="Start Date" name="startDate" type="date" required />
                <Field label="End Date" name="endDate" type="date" required />
                <Field label="Reason (optional)" name="reason" />
                <SubmitButton label="Submit Request" />
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
