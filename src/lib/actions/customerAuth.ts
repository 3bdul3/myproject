"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { rawCustomerLookup } from "@/lib/db";
import { createCustomerSession, destroyCustomerSession } from "@/lib/customerAuth";
import { checkNotLocked, recordFailedAttempt, recordSuccess, scopedIdentifier } from "@/lib/rateLimiter";
import { logAudit } from "@/lib/actions/auditLog";
import { customerDisplayName } from "@/lib/customer";
import type { Customer } from "@/types";

export async function customerLoginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) return { error: "Enter your username and password." };

  const identifier = scopedIdentifier("customer", username);
  const { locked, retryAfterMinutes } = await checkNotLocked(identifier);
  if (locked) return { error: `Too many failed attempts. Try again in ${retryAfterMinutes} minute(s).` };

  const customer = await rawCustomerLookup.findOneAsync<Customer>({ portalUsername: username });
  if (!customer || !customer.portalActive || !customer.portalPasswordHash) {
    await recordFailedAttempt(identifier);
    return { error: "Invalid username or password." };
  }

  const valid = await bcrypt.compare(password, customer.portalPasswordHash);
  if (!valid) {
    const { justLocked } = await recordFailedAttempt(identifier);
    if (justLocked && customer.companyId) {
      await logAudit(
        customer.companyId,
        customer._id!,
        customerDisplayName(customer),
        "portal_account_locked",
        "customer",
        customer._id,
        `Customer portal account locked after repeated failed logins (${username})`
      );
    }
    return { error: "Invalid username or password." };
  }

  await recordSuccess(identifier);
  await createCustomerSession(customer._id!, customer.companyId!);
  redirect("/customer/dashboard");
}

export async function customerLogoutAction() {
  await destroyCustomerSession();
  redirect("/customer/login");
}
