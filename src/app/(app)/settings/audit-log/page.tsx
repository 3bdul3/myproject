import { requireRole } from "@/lib/authz";
import { listAuditLog } from "@/lib/actions/auditLog";
import { PageHeader, Card, Badge } from "@/components/ui";

export default async function AuditLogPage() {
  await requireRole(["admin"]);
  const entries = await listAuditLog();

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Financial postings, approval decisions, and account/security changes"
        breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Settings" }]}
      />

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e._id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 text-stone-500">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-stone-700">{e.userName}</td>
                <td className="px-4 py-3">
                  <Badge text={e.action.replace(/_/g, " ")} tone="indigo" />
                </td>
                <td className="px-4 py-3 text-stone-600">{e.summary}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
