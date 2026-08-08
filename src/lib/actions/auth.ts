"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { checkNotLocked, scopedIdentifier } from "@/lib/rateLimiter";
import { findUserByIdentifier } from "@/lib/userLookup";

export async function loginAction(
  _prevState: { error?: string; step?: "totp" } | undefined,
  formData: FormData
) {
  const rawIdentifier = String(formData.get("email") || "").trim();
  const totpCode = String(formData.get("totpCode") || "").trim();

  const { locked, retryAfterMinutes } = await checkNotLocked(scopedIdentifier("staff", rawIdentifier));
  if (locked) {
    return { error: `Too many failed attempts. Try again in ${retryAfterMinutes} minute(s).` };
  }

  const user = await findUserByIdentifier(rawIdentifier);
  if (user?.disabled) {
    return { error: "This account has been disabled. Contact your administrator." };
  }
  if (!totpCode && user?.totpEnabled) {
    return { step: "totp" as const };
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      totpCode,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: totpCode ? "Invalid email/code, password, or authentication code" : "Invalid email/code or password" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
