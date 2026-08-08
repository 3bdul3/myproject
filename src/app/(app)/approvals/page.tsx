import { requireRole } from "@/lib/authz";
import { listPendingApprovals, decideApproval } from "@/lib/actions/approvals";
import { listPendingLeaveRequests, decideLeaveRequest } from "@/lib/actions/leave";
import { PageHeader, Card, Badge } from "@/components/ui";

const TARGET_LABEL: Record<string, string> = {
  invoice: "Tax invoice",
  bill: "Supplier bill",
  purchase_order: "Purchase order",
};

export default async function ApprovalsPage() {
  const session = await requireRole(["admin", "accountant", "hr"]);
  const role = session?.user?.role;
  const canSeeFinancial = role === "admin" || role === "accountant";
  const canSeeLeave = role === "admin" || role === "hr";

  const [financial, leave] = await Promise.all([
    canSeeFinancial ? listPendingApprovals() : Promise.resolve([]),
    canSeeLeave ? listPendingLeaveRequests() : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Pending requests that need an admin/accountant or admin/hr decision"
        breadcrumb={[{ label: "Home", href: "/dashboard" }]}
      />

      <div className="space-y-6">
        {canSeeFinancial && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Financial Approvals</h3>
            {financial.length === 0 ? (
              <p className="text-sm text-stone-400">Nothing pending.</p>
            ) : (
              <div className="space-y-3">
                {financial.map((req) => (
                  <div key={req._id} className="rounded-lg border border-stone-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-stone-800">
                        {TARGET_LABEL[req.targetType] ?? req.targetType} {req.targetNumber}
                      </p>
                      <Badge text="pending" tone="amber" />
                    </div>
                    <p className="mb-3 text-xs text-stone-500">Requested by {req.requestedByName}</p>
                    <div className="flex items-end gap-2">
                      <form action={decideApproval.bind(null, req._id!, "approved")} className="flex-1">
                        <input
                          name="note"
                          placeholder="Note (optional)"
                          className="mb-2 w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        </div>
                      </form>
                      <form action={decideApproval.bind(null, req._id!, "rejected")}>
                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {canSeeLeave && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Leave Requests</h3>
            {leave.length === 0 ? (
              <p className="text-sm text-stone-400">Nothing pending.</p>
            ) : (
              <div className="space-y-3">
                {leave.map((req) => (
                  <div key={req._id} className="rounded-lg border border-stone-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-stone-800">{req.employeeName}</p>
                      <Badge text="pending" tone="amber" />
                    </div>
                    <p className="mb-3 text-xs text-stone-500">
                      {req.leaveType} · {req.startDate} to {req.endDate}
                      {req.reason ? ` — ${req.reason}` : ""}
                    </p>
                    <div className="flex items-end gap-2">
                      <form action={decideLeaveRequest.bind(null, req._id!, "approved")} className="flex-1">
                        <input
                          name="note"
                          placeholder="Note (optional)"
                          className="mb-2 w-full rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={decideLeaveRequest.bind(null, req._id!, "rejected")}>
                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
