"use server";

import { db } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";
import { auth } from "@/auth";
import type { AuditLogEntry } from "@/types";

/** Internal helper — companyId passed in like createNotification, since callers already resolved it. */
export async function logAudit(
  companyId: string,
  userId: string,
  userName: string,
  action: string,
  entityType: string,
  entityId: string | undefined,
  summary: string
) {
  await db.auditLog.insertAsync<AuditLogEntry>(companyId, {
    userId,
    userName,
    action,
    entityType,
    entityId,
    summary,
    createdAt: new Date().toISOString(),
  });
}

export async function listAuditLog() {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (session?.user?.role !== "admin") return [];
  return db.auditLog.findAsync<AuditLogEntry>(companyId, {}).sort({ createdAt: -1 });
}
