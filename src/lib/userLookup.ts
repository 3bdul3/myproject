import { db } from "@/lib/db";
import type { User } from "@/types";

/**
 * Staff sign-in accepts either an email or an admin-assigned login code in the same field.
 * Email match is case-insensitive (matches how it's stored); login codes are matched exactly
 * as typed, since admins may deliberately mix case when designing a memorable code.
 */
export async function findUserByIdentifier(raw: string): Promise<User | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const byEmail = await db.users.findOneAsync<User>({ email: trimmed.toLowerCase() });
  if (byEmail) return byEmail;

  return db.users.findOneAsync<User>({ loginCode: trimmed });
}
