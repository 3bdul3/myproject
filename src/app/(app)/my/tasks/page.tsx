import { listMyTasks, createTask, toggleTask, deleteTask } from "@/lib/actions/tasks";
import { PageHeader, Card, Field, SubmitButton } from "@/components/ui";

export default async function MyTasksPage() {
  const tasks = await listMyTasks();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="A personal to-do list — only you can see or manage these"
        breadcrumb={[{ label: "Home", href: "/dashboard" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Done</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {[...open, ...done].map((t) => (
                <tr key={t._id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3">
                    <form action={toggleTask.bind(null, t._id!, !t.done)}>
                      <button
                        type="submit"
                        aria-label={t.done ? "Mark not done" : "Mark done"}
                        className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                          t.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 text-transparent"
                        }`}
                      >
                        ✓
                      </button>
                    </form>
                  </td>
                  <td className={`px-4 py-3 font-medium ${t.done ? "text-stone-400 line-through" : "text-stone-800"}`}>
                    {t.title}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{t.dueDate || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteTask.bind(null, t._id!)}>
                      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                    No tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">+ New Task</h3>
            <form action={createTask} className="space-y-3">
              <Field label="Title" name="title" required />
              <Field label="Due Date (optional)" name="dueDate" type="date" />
              <SubmitButton label="Add Task" />
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
