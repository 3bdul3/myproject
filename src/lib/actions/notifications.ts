"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import { sendEmail } from "@/lib/email";
import type { Notification, NotificationType, User } from "@/types";

/** Notification types important enough to also email the recipient — not every routine event. */
const EMAIL_NOTIFICATION_TYPES: Set<NotificationType> = new Set([
  "approval_requested",
  "approval_approved",
  "approval_rejected",
  "leave_decided",
]);

/**
 * Internal helper — called from other actions that already resolved `companyId` (same pattern
 * as `postJournalEntry`/`getAccountByCode` in accounting.ts), not `getActiveCompanyId()`-first.
 */
export async function createNotification(
  companyId: string,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  href?: string
) {
  await db.notifications.insertAsync<Notification>(companyId, {
    userId,
    type,
    title,
    body,
    href,
    read: false,
    createdAt: new Date().toISOString(),
  });

  if (EMAIL_NOTIFICATION_TYPES.has(type)) {
    const recipient = await db.users.findOneAsync<User>({ _id: userId });
    if (recipient?.email) {
      await sendEmail(recipient.email, title, body);
    }
  }
}

export async function listNotifications(limit = 20) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return [];
  return db.notifications
    .findAsync<Notification>(companyId, { userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(limit);
}

export async function getUnreadNotificationCount() {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return 0;
  return db.notifications.countAsync(companyId, { userId: session.user.id, read: false });
}

export async function markNotificationRead(id: string) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return;
  await db.notifications.updateAsync(companyId, { _id: id, userId: session.user.id }, { $set: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (!session?.user) return;
  await db.notifications.updateAsync(
    companyId,
    { userId: session.user.id, read: false },
    { $set: { read: true } },
    { multi: true }
  );
  revalidatePath("/", "layout");
}
