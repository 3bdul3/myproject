import { requireRole } from "@/lib/authz";
import { listBackups, triggerBackup } from "@/lib/actions/backup";
import { PageHeader, Card } from "@/components/ui";
import ResetDataForm from "@/components/ResetDataForm";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function BackupsPage() {
  await requireRole(["admin"]);
  const backups = await listBackups();

  return (
    <div>
      <PageHeader
        title="Data Backups"
        subtitle="Snapshot the entire database to a timestamped folder on this server"
        breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Settings" }]}
      />

      <div className="space-y-6">
        <Card>
          <p className="mb-3 text-sm text-stone-500">
            Creates a full copy of the current database under a new{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">data-backup-*</code> folder in the project
            root. This runs on-demand — for automatic scheduled backups, run{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">npm run backup</code> from an OS-level
            scheduler once this app is deployed somewhere persistent.
          </p>
          <form action={triggerBackup}>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Backup Now
            </button>
          </form>
        </Card>

        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Backup</th>
                <th className="px-4 py-3">Files</th>
                <th className="px-4 py-3">Size</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.name} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-stone-700">{b.name}</td>
                  <td className="px-4 py-3 text-stone-500">{b.fileCount}</td>
                  <td className="px-4 py-3 text-stone-500">{formatBytes(b.sizeBytes)}</td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-stone-400">
                    No backups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="border-red-200">
          <h3 className="mb-3 text-sm font-semibold text-red-700">Danger Zone — Reset Business Data</h3>
          <ResetDataForm />
        </Card>
      </div>
    </div>
  );
}
