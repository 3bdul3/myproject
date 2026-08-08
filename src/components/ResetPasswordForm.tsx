"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/actions/passwordReset";
import PasswordField from "@/components/PasswordField";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, undefined);

  if (state?.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Your password has been reset.
        </p>
        <Link href="/login" className="block text-center text-sm font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
        Missing reset token — use the link from your email.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <PasswordField label="New password" name="password" required minLength={8} autoComplete="new-password" />
      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        required
        minLength={8}
        autoComplete="new-password"
      />

      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Reset password"}
      </button>
    </form>
  );
}
