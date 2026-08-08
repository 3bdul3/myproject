"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isMultiCompanyRole, getActiveCompanyId } from "@/lib/authz";
import { logAudit } from "@/lib/actions/auditLog";
import type { Employee, Role, User } from "@/types";

export async function listUsers() {
  const session = await auth();
  if (session?.user?.role !== "admin") return [];
  return db.users.findAsync<User>({}).sort({ createdAt: 1 });
}

export async function createUser(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "") as Role;
  const companyId = String(formData.get("companyId") || "") || undefined;
  const employeeId = String(formData.get("employeeId") || "") || undefined;
  const loginCode = String(formData.get("loginCode") || "").trim() || undefined;

  if (!name || !email || !password || !role) return;
  if (!isMultiCompanyRole(role) && !companyId) return; // locked roles must have a company

  const existing = await db.users.findOneAsync<User>({ email });
  if (existing) return;

  if (loginCode) {
    const existingCode = await db.users.findOneAsync<User>({ loginCode });
    if (existingCode) return; // code already taken — silently no-op, matching the email-conflict behavior above
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await db.users.insertAsync<User>({
    name,
    email,
    passwordHash,
    role,
    companyId: isMultiCompanyRole(role) ? undefined : companyId,
    loginCode,
    // The admin-set password above is a starter — force a real change on first login.
    mustChangePassword: true,
    passwordChangedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  if (employeeId && companyId) {
    await db.employees.updateAsync(companyId, { _id: employeeId }, { $set: { userId: created._id } });
  }

  const auditCompanyId = await getActiveCompanyId();
  await logAudit(
    auditCompanyId,
    session.user.id,
    session.user.name ?? "",
    "create_user",
    "user",
    created._id,
    `Created user ${email} (role: ${role})`
  );

  revalidatePath("/settings/users");
}

/** Link (or re-link) an existing user to an employee record in the currently active company. */
export async function linkEmployeeToUser(userId: string, employeeId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const companyId = await getActiveCompanyId();
  await db.employees.updateAsync(companyId, { _id: employeeId }, { $set: { userId } });
  await logAudit(
    companyId,
    session.user.id,
    session.user.name ?? "",
    "link_employee_to_user",
    "user",
    userId,
    `Linked user to employee record`
  );
  revalidatePath("/settings/users");
}

export async function listEmployeesForLinking() {
  const companyId = await getActiveCompanyId();
  return db.employees.findAsync<Employee>(companyId, {}).sort({ name: 1 });
}

/** Admin-only: employees per company, for the "Linked Employee" picker on /settings/users. */
export async function listEmployeesByCompany(companyIds: string[]) {
  const session = await auth();
  if (session?.user?.role !== "admin") return {};

  const entries = await Promise.all(
    companyIds.map(async (companyId) => {
      const employees = await db.employees.findAsync<Employee>(companyId, {}).sort({ name: 1 });
      return [companyId, employees] as const;
    })
  );
  return Object.fromEntries(entries);
}

/** Admin-only: suspends/reinstates a staff login. A disabled user can't sign in until re-enabled. Admins can't disable their own account (avoids self-lockout). */
export async function setUserActive(userId: string, active: boolean) {
  const session = await auth();
  if (session?.user?.role !== "admin") return;
  if (userId === session.user.id) return;

  const target = await db.users.findOneAsync<User>({ _id: userId });
  if (!target) return;

  await db.users.updateAsync({ _id: userId }, { $set: { disabled: !active } });

  const auditCompanyId = await getActiveCompanyId();
  await logAudit(
    auditCompanyId,
    session.user.id,
    session.user.name ?? "",
    active ? "enable_user" : "disable_user",
    "user",
    userId,
    `${active ? "Enabled" : "Disabled"} account for ${target.email}`
  );

  revalidatePath("/settings/users");
}

/** Admin-only: sets/updates a user's login code, an alternative to email at sign-in. Globally unique like email. */
export async function setUserLoginCode(userId: string, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const loginCode = String(formData.get("loginCode") || "").trim();
  if (!loginCode) return;

  const target = await db.users.findOneAsync<User>({ _id: userId });
  if (!target) return;

  try {
    await db.users.updateAsync({ _id: userId }, { $set: { loginCode } });
  } catch {
    redirect(
      `/settings/users?error=${encodeURIComponent("That login code is already taken — choose another.")}`
    );
  }

  const auditCompanyId = await getActiveCompanyId();
  await logAudit(
    auditCompanyId,
    session.user.id,
    session.user.name ?? "",
    "set_user_login_code",
    "user",
    userId,
    `Set login code for ${target.email}`
  );

  revalidatePath("/settings/users");
}

/** Admin-only: sets a new temporary password for an existing user and forces them to change it on next login. */
export async function resetUserPassword(userId: string, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const newPassword = String(formData.get("newPassword") || "");
  if (newPassword.length < 8) {
    redirect(`/settings/users?error=${encodeURIComponent("Temporary password must be at least 8 characters.")}`);
  }

  const target = await db.users.findOneAsync<User>({ _id: userId });
  if (!target) return;

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.users.updateAsync(
    { _id: userId },
    { $set: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date().toISOString() } }
  );

  const auditCompanyId = await getActiveCompanyId();
  await logAudit(
    auditCompanyId,
    session.user.id,
    session.user.name ?? "",
    "reset_user_password",
    "user",
    userId,
    `Set a temporary password for ${target.email} (must change on next login)`
  );

  revalidatePath("/settings/users");
}
