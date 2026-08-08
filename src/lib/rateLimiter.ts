import { db } from "@/lib/db";

interface LoginAttempt {
  _id?: string;
  identifier: string;
  failedCount: number;
  lockedUntil?: string;
  lastAttemptAt: string;
}

const DEFAULT_THRESHOLD = 5;
const DEFAULT_LOCKOUT_MINUTES = 15;

/** Namespace an identifier by login surface so staff/supplier/customer/reset attempts never collide. */
export function scopedIdentifier(scope: "staff" | "supplier" | "customer" | "reset", value: string) {
  return `${scope}:${value.toLowerCase().trim()}`;
}

export async function checkNotLocked(identifier: string): Promise<{ locked: boolean; retryAfterMinutes?: number }> {
  const record = await db.loginAttempts.findOneAsync<LoginAttempt>({ identifier });
  if (!record?.lockedUntil) return { locked: false };

  const lockedUntilMs = new Date(record.lockedUntil).getTime();
  if (Date.now() >= lockedUntilMs) return { locked: false };

  return { locked: true, retryAfterMinutes: Math.ceil((lockedUntilMs - Date.now()) / 60000) };
}

/** Returns whether THIS call is the one that just crossed the threshold — callers can use this to log a lockout event once, not on every failed attempt. */
export async function recordFailedAttempt(
  identifier: string,
  opts: { threshold?: number; lockoutMinutes?: number } = {}
): Promise<{ justLocked: boolean }> {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const lockoutMinutes = opts.lockoutMinutes ?? DEFAULT_LOCKOUT_MINUTES;

  const record = await db.loginAttempts.findOneAsync<LoginAttempt>({ identifier });
  const wasLocked = !!record?.lockedUntil && new Date(record.lockedUntil).getTime() > Date.now();
  const failedCount = (record?.failedCount ?? 0) + 1;
  const patch: Partial<LoginAttempt> = { failedCount, lastAttemptAt: new Date().toISOString() };
  const justLocked = !wasLocked && failedCount >= threshold;
  if (justLocked) {
    patch.lockedUntil = new Date(Date.now() + lockoutMinutes * 60000).toISOString();
  }

  if (record) {
    await db.loginAttempts.updateAsync({ _id: record._id }, { $set: patch });
  } else {
    await db.loginAttempts.insertAsync<LoginAttempt>({ identifier, ...patch } as LoginAttempt);
  }

  return { justLocked };
}

export async function recordSuccess(identifier: string) {
  await db.loginAttempts.removeAsync({ identifier }, {});
}
