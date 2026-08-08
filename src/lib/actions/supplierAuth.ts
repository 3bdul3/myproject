"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { rawSupplierLookup } from "@/lib/db";
import { createSupplierSession, destroySupplierSession } from "@/lib/supplierAuth";
import { checkNotLocked, recordFailedAttempt, recordSuccess, scopedIdentifier } from "@/lib/rateLimiter";
import { logAudit } from "@/lib/actions/auditLog";
import type { Supplier } from "@/types";

export async function supplierLoginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) return { error: "Enter your username and password." };

  const identifier = scopedIdentifier("supplier", username);
  const { locked, retryAfterMinutes } = await checkNotLocked(identifier);
  if (locked) return { error: `Too many failed attempts. Try again in ${retryAfterMinutes} minute(s).` };

  const supplier = await rawSupplierLookup.findOneAsync<Supplier>({ portalUsername: username });
  if (!supplier || !supplier.portalActive || !supplier.portalPasswordHash) {
    await recordFailedAttempt(identifier);
    return { error: "Invalid username or password." };
  }

  const valid = await bcrypt.compare(password, supplier.portalPasswordHash);
  if (!valid) {
    const { justLocked } = await recordFailedAttempt(identifier);
    if (justLocked && supplier.companyId) {
      await logAudit(
        supplier.companyId,
        supplier._id!,
        supplier.name,
        "portal_account_locked",
        "supplier",
        supplier._id,
        `Supplier portal account locked after repeated failed logins (${username})`
      );
    }
    return { error: "Invalid username or password." };
  }

  await recordSuccess(identifier);
  await createSupplierSession(supplier._id!, supplier.companyId!);
  redirect("/supplier/dashboard");
}

export async function supplierLogoutAction() {
  await destroySupplierSession();
  redirect("/supplier/login");
}
