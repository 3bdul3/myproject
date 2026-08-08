"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { User } from "@/types";

/** Self-service: any logged-in user can change their own password. Requires the current one. */
export async function changePassword(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "New passwords don't match." };

  const user = await db.users.findOneAsync<User>({ _id: session.user.id });
  if (!user) redirect("/login");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.users.updateAsync(
    { _id: session.user.id },
    { $set: { passwordHash, passwordChangedAt: new Date().toISOString() }, $unset: { mustChangePassword: true } }
  );

  redirect("/dashboard");
}
