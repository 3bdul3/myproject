import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { checkNotLocked, recordFailedAttempt, recordSuccess, scopedIdentifier } from "@/lib/rateLimiter";
import { verifyTotpCode } from "@/lib/totp";
import { findUserByIdentifier } from "@/lib/userLookup";
import { logAudit } from "@/lib/actions/auditLog";
import type { Role } from "@/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, totpCode: {} },
      authorize: async (credentials) => {
        // The field is still named "email" on the wire, but accepts either an email or an
        // admin-assigned login code — see findUserByIdentifier.
        const rawIdentifier = (credentials?.email as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;
        const totpCode = (credentials?.totpCode as string | undefined)?.trim();
        if (!rawIdentifier || !password) return null;

        const identifier = scopedIdentifier("staff", rawIdentifier);
        const { locked } = await checkNotLocked(identifier);
        if (locked) return null;

        const user = await findUserByIdentifier(rawIdentifier);
        if (!user) {
          await recordFailedAttempt(identifier);
          return null;
        }

        // Defensive backstop — loginAction already checks this and returns a clearer message,
        // but authorize() must never let a disabled account through even if called some other way.
        if (user.disabled) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const { justLocked } = await recordFailedAttempt(identifier);
          if (justLocked && user.companyId) {
            await logAudit(user.companyId, user._id!, user.name, "account_locked", "user", user._id, `Account locked after repeated failed logins (${user.email})`);
          }
          return null;
        }

        if (user.totpEnabled) {
          if (!user.totpSecret || !verifyTotpCode(user.totpSecret, totpCode ?? "")) {
            const { justLocked } = await recordFailedAttempt(identifier);
            if (justLocked && user.companyId) {
              await logAudit(user.companyId, user._id!, user.name, "account_locked", "user", user._id, `Account locked after repeated failed logins (${user.email})`);
            }
            return null;
          }
        }

        await recordSuccess(identifier);

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as unknown as { role: Role }).role;
        token.id = user.id as string;
        token.companyId = (user as unknown as { companyId?: string }).companyId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.role = token.role as Role;
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string | undefined;
      }
      return session;
    },
  },
});
