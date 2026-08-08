"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import { createNotification } from "@/lib/actions/notifications";
import { logAudit } from "@/lib/actions/auditLog";
import type { ApprovalRequest, ApprovalTargetType, User } from "@/types";

const TARGET_LABEL: Record<ApprovalTargetType, string> = {
  invoice: "Tax invoice",
  bill: "Supplier bill",
  purchase_order: "Purchase order",
};

/** admin + accountant can approve financial requests — both roles are multi-company, so unfiltered. */
export async function getFinancialApprovers() {
  return db.users.findAsync<User>({ role: { $in: ["admin", "accountant"] } });
}

/**
 * Internal helper — called from postInvoice/postBill/sendPurchaseOrderToSupplier, which have
 * already resolved `companyId` (same pattern as postJournalEntry). One live record per target:
 * a resubmit after rejection reopens the same record to "pending" rather than creating a new one.
 */
export async function ensureApprovalRequest(
  companyId: string,
  targetType: ApprovalTargetType,
  targetId: string,
  targetNumber: string,
  requestedByUserId: string,
  requestedByName: string
): Promise<ApprovalRequest> {
  const existing = await db.approvalRequests.findOneAsync<ApprovalRequest>(companyId, { targetType, targetId });
  if (existing && existing.status !== "rejected") return existing;

  if (existing) {
    await db.approvalRequests.updateAsync(
      companyId,
      { _id: existing._id },
      {
        $set: { status: "pending" },
        $unset: { decidedByUserId: true, decidedByName: true, decidedAt: true, note: true },
      }
    );
  } else {
    await db.approvalRequests.insertAsync<ApprovalRequest>(companyId, {
      targetType,
      targetId,
      targetNumber,
      requestedByUserId,
      requestedByName,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  const approvers = await getFinancialApprovers();
  const label = TARGET_LABEL[targetType];
  await Promise.all(
    approvers.map((a) =>
      createNotification(
        companyId,
        a._id!,
        "approval_requested",
        `${label} ${targetNumber} needs approval`,
        `Requested by ${requestedByName}.`,
        "/approvals"
      )
    )
  );

  return (await db.approvalRequests.findOneAsync<ApprovalRequest>(companyId, { targetType, targetId }))!;
}

export async function getApprovalRequestFor(targetType: ApprovalTargetType, targetId: string) {
  const companyId = await getActiveCompanyId();
  return db.approvalRequests.findOneAsync<ApprovalRequest>(companyId, { targetType, targetId });
}

export async function listPendingApprovals() {
  const companyId = await getActiveCompanyId();
  return db.approvalRequests.findAsync<ApprovalRequest>(companyId, { status: "pending" }).sort({ createdAt: 1 });
}

export async function decideApproval(id: string, decision: "approved" | "rejected", formData: FormData) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) return;

  const request = await db.approvalRequests.findOneAsync<ApprovalRequest>(companyId, { _id: id });
  if (!request || request.status !== "pending") return;

  const note = String(formData.get("note") || "");

  await db.approvalRequests.updateAsync(
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

  const label = TARGET_LABEL[request.targetType];
  await createNotification(
    companyId,
    request.requestedByUserId,
    decision === "approved" ? "approval_approved" : "approval_rejected",
    `${label} ${request.targetNumber} was ${decision}`,
    note || (decision === "approved" ? "You can now post it." : "See the request for details."),
    targetHref(request)
  );
  await logAudit(
    companyId,
    session.user.id,
    session.user.name ?? "",
    `${decision}_approval`,
    request.targetType,
    request.targetId,
    `${decision === "approved" ? "Approved" : "Rejected"} ${label.toLowerCase()} ${request.targetNumber}`
  );

  revalidatePath("/approvals");
  revalidatePath(targetHref(request));
}

function targetHref(request: ApprovalRequest) {
  switch (request.targetType) {
    case "invoice":
      return `/accounting/invoices/${request.targetNumber}`;
    case "bill":
      return `/accounting/payable/${request.targetNumber}`;
    case "purchase_order":
      return "/inventory/purchase-orders";
    default:
      return "/approvals";
  }
}
