"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import { createNotification } from "@/lib/actions/notifications";
import { logAudit } from "@/lib/actions/auditLog";
import type { Employee, LeaveRequest, User } from "@/types";

export async function getMyEmployeeRecord() {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return null;
  return db.employees.findOneAsync<Employee>(companyId, { userId: session.user.id });
}

/**
 * admin (global — sees every company) union hr (filtered to companyId — a locked role, so
 * notifying every hr user across every tenant would leak a leave request across companies).
 * Do not copy getFinancialApprovers' unfiltered pattern here.
 */
export async function getLeaveApprovers(companyId: string) {
  const [admins, hrUsers] = await Promise.all([
    db.users.findAsync<User>({ role: "admin" }),
    db.users.findAsync<User>({ role: "hr", companyId }),
  ]);
  return [...admins, ...hrUsers];
}

export async function submitLeaveRequest(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return;

  const employee = await db.employees.findOneAsync<Employee>(companyId, { userId: session.user.id });
  if (!employee) return; // no linked employee record — nothing to request leave for

  const leaveType = String(formData.get("leaveType") || "Annual");
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const reason = String(formData.get("reason") || "");
  if (!startDate || !endDate) return;

  await db.leaveRequests.insertAsync<LeaveRequest>(companyId, {
    employeeId: employee._id!,
    employeeName: employee.name,
    requestedByUserId: session.user.id,
    leaveType,
    startDate,
    endDate,
    reason,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  const approvers = await getLeaveApprovers(companyId);
  await Promise.all(
    approvers.map((a) =>
      createNotification(
        companyId,
        a._id!,
        "leave_requested",
        `Leave request: ${employee.name}`,
        `${leaveType}, ${startDate} to ${endDate}.`,
        "/approvals"
      )
    )
  );

  revalidatePath("/my/leave");
}

export async function listMyLeaveRequests() {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return [];
  return db.leaveRequests
    .findAsync<LeaveRequest>(companyId, { requestedByUserId: session.user.id })
    .sort({ createdAt: -1 });
}

export async function listPendingLeaveRequests() {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user || !["admin", "hr"].includes(session.user.role)) return [];
  return db.leaveRequests.findAsync<LeaveRequest>(companyId, { status: "pending" }).sort({ createdAt: 1 });
}

export async function decideLeaveRequest(id: string, decision: "approved" | "rejected", formData: FormData) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user || !["admin", "hr"].includes(session.user.role)) return;

  const request = await db.leaveRequests.findOneAsync<LeaveRequest>(companyId, { _id: id });
  if (!request || request.status !== "pending") return;

  const note = String(formData.get("note") || "");

  await db.leaveRequests.updateAsync(
    companyId,
    { _id: id },
    {
      $set: {
        status: decision,
        decidedByUserId: session.user.id,
        decidedByName: session.user.name ?? "",
        decidedAt: new Date().toISOString(),
        note,
      },
    }
  );

  await createNotification(
    companyId,
    request.requestedByUserId,
    "leave_decided",
    `Your leave request was ${decision}`,
    note || `${request.leaveType}, ${request.startDate} to ${request.endDate}.`,
    "/my/leave"
  );
  await logAudit(
    companyId,
    session.user.id,
    session.user.name ?? "",
    `${decision}_leave_request`,
    "leave_request",
    id,
    `${decision === "approved" ? "Approved" : "Rejected"} leave request for ${request.employeeName}`
  );

  revalidatePath("/approvals");
  revalidatePath("/my/leave");
}
