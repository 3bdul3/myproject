"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { checkNotLocked, recordFailedAttempt, scopedIdentifier } from "@/lib/rateLimiter";
import type { User as AppUser } from "@/types";

interface PasswordResetToken {
  _id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

const GENERIC_MESSAGE = "If that email exists, we've sent a password reset link.";
const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(_prevState: { message?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  if (!email) return { message: GENERIC_MESSAGE };

  const identifier = scopedIdentifier("reset", email);
  const { locked } = await checkNotLocked(identifier);
  if (locked) return { message: GENERIC_MESSAGE };

  // Every request counts toward the cooldown cap, regardless of whether the email exists —
  // otherwise an attacker could probe for valid emails by watching which ones don't get capped.
  await recordFailedAttempt(identifier, { threshold: 3, lockoutMinutes: 15 });

  const user = await db.users.findOneAsync<AppUser>({ email });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    await db.passwordResetTokens.removeAsync({ userId: user._id }, { multi: true });
    await db.passwordResetTokens.insertAsync<PasswordResetToken>({
      userId: user._id!,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    const host = (await headers()).get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const resetUrl = `${protocol}://${host}/reset-password?token=${rawToken}`;

    await sendEmail(
      user.email,
      "Reset your password",
      `Click the link below to reset your password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`
    );
  }

  return { message: GENERIC_MESSAGE };
}

export async function resetPassword(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) return { error: "Missing reset token." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await db.passwordResetTokens.findOneAsync<PasswordResetToken>({ tokenHash });
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.users.updateAsync({ _id: record.userId }, { $set: { passwordHash } });
  await db.passwordResetTokens.removeAsync({ userId: record.userId }, { multi: true });

  return { success: true };
}
