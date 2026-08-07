import { createDepartment, listDepartments } from "@/lib/actions/hr";
import { PageHeader, Card, Field, SubmitButton } from "@/components/ui";

export default async function DepartmentsPage() {
  const departments = await listDepartments();

  return (
    <div>
      <PageHeader title="Departments" subtitle="Organizational structure" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {departments.map((d) => (
            <Card key={d._id}>
              <p className="font-semibold text-stone-800">{d.name}</p>
              <p className="text-sm text-stone-500">{d.managerName || "No manager assigned"}</p>
            </Card>
          ))}
          {departments.length === 0 && <p className="text-sm text-stone-400">No departments yet.</p>}
        </div>

        <div className="space-y-6">
          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ New Department</summary>
              <form action={createDepartment} className="mt-4 grid grid-cols-1 gap-3">
                <Field label="Name" name="name" required />
                <Field label="Manager" name="managerName" />
                <SubmitButton label="Add Department" />
              </form>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
