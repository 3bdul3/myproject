"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import type { TaskItem } from "@/types";

export async function listMyTasks() {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return [];
  return db.tasks.findAsync<TaskItem>(companyId, { userId: session.user.id }).sort({ createdAt: -1 });
}

export async function createTask(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return;

  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const dueDate = String(formData.get("dueDate") || "") || undefined;

  await db.tasks.insertAsync<TaskItem>(companyId, {
    userId: session.user.id,
    title,
    dueDate,
    done: false,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/my/tasks");
}

export async function toggleTask(id: string, done: boolean) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return;

  await db.tasks.updateAsync(
    companyId,
    { _id: id, userId: session.user.id },
    done
      ? { $set: { done: true, doneAt: new Date().toISOString() } }
      : { $set: { done: false }, $unset: { doneAt: true } }
  );

  revalidatePath("/my/tasks");
}

export async function deleteTask(id: string) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return;

  await db.tasks.removeAsync(companyId, { _id: id, userId: session.user.id });

  revalidatePath("/my/tasks");
}
