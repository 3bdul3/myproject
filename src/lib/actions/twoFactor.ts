"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";
import { generateTotpSecret, buildTotpUri, verifyTotpCode } from "@/lib/totp";
import { logAudit } from "@/lib/actions/auditLog";
import type { User } from "@/types";

export async function getMyTotpStatus() {
  const session = await auth();
  if (!session?.user) return { enabled: false };
  const user = await db.users.findOneAsync<User>({ _id: session.user.id });
  return { enabled: !!user?.totpEnabled };
}

/** Starts (or restarts) enrollment: stores a pending secret, does NOT enable 2FA yet. */
export async function enrollTotp() {
  const session = await auth();
  if (!session?.user) return null;

  const secret = generateTotpSecret();
  await db.users.updateAsync(
    { _id: session.user.id },
    { $set: { totpSecret: secret.base32 }, $unset: { totpEnabled: true } }
  );

  const otpauthUri = buildTotpUri(session.user.email ?? session.user.name ?? "user", secret.base32);
  const qrDataUrl = await QRCode.toDataURL(otpauthUri);

  return { qrDataUrl, secret: secret.base32 };
}

/** Requires one valid code against the pending secret before actually enabling 2FA. */
export async function confirmTotpEnrollment(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const code = String(formData.get("code") || "").trim();
  const user = await db.users.findOneAsync<User>({ _id: session.user.id });
  if (!user?.totpSecret) return { error: "Start enrollment first." };

  if (!verifyTotpCode(user.totpSecret, code)) {
    return { error: "Invalid code — try again." };
  }

  await db.users.updateAsync({ _id: user._id }, { $set: { totpEnabled: true } });
  const auditCompanyId = await getActiveCompanyId();
  await logAudit(auditCompanyId, session.user.id, session.user.name ?? "", "enable_2fa", "user", user._id, "Enabled two-factor authentication");
  revalidatePath("/settings/security");
  return { success: true };
}

export async function disableTotp() {
  const session = await auth();
  if (!session?.user) return;

  await db.users.updateAsync({ _id: session.user.id }, { $unset: { totpSecret: true, totpEnabled: true } });
  const auditCompanyId = await getActiveCompanyId();
  await logAudit(
    auditCompanyId,
    session.user.id,
    session.user.name ?? "",
    "disable_2fa",
    "user",
    session.user.id,
    "Disabled two-factor authentication"
  );
  revalidatePath("/settings/security");
}

/** Admin-only break-glass path for a user who lost their authenticator device. */
export async function adminDisableTotp(userId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  await db.users.updateAsync({ _id: userId }, { $unset: { totpSecret: true, totpEnabled: true } });
  const auditCompanyId = await getActiveCompanyId();
  await logAudit(
    auditCompanyId,
    session.user.id,
    session.user.name ?? "",
    "admin_disable_2fa",
    "user",
    userId,
    "Admin reset two-factor authentication for a user"
  );
  revalidatePath("/settings/users");
}
