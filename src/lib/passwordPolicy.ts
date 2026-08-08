import { PASSWORD_MAX_AGE_DAYS } from "@/lib/constants";

export function isPasswordExpired(passwordChangedAt: string | undefined): boolean {
  if (!passwordChangedAt) return false;
  const ageMs = Date.now() - new Date(passwordChangedAt).getTime();
  return ageMs > PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}
